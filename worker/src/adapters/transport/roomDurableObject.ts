import { RoomEngine } from '../../domain/room';
import { RoomService } from '../../application/roomService';
import { StaticEntitlementProvider } from '../entitlement/staticEntitlementProvider';
import { EVENTS } from '../../constants';

interface RoomSession {
  ws: WebSocket;
  displayName: string | null;
}

interface RoomMessage {
  type: string;
  payload?: any;
}

export interface Env {
  ROOM: DurableObjectNamespace;
}

/**
 * Durable Object class for room management.
 * Acts as the transport adapter; business rules live in RoomService.
 */
export class RoomDurableObject {
  private readonly state: DurableObjectState;
  private readonly env: Env;
  private readonly sessions = new Map<string, RoomSession>();
  private readonly roomService: RoomService;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    const roomId = state.id.toString();
    const engine = new RoomEngine();
    const entitlementProvider = new StaticEntitlementProvider();
    this.roomService = new RoomService(roomId, engine, entitlementProvider);
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    const sessionId = crypto.randomUUID();

    server.accept();
    this.sessions.set(sessionId, { ws: server, displayName: null });

    server.addEventListener('message', async (event) => {
      await this.handleMessage(sessionId, event.data);
    });

    server.addEventListener('close', () => {
      this.handleDisconnect(sessionId);
    });

    server.addEventListener('error', (err) => {
      console.error('WebSocket error:', err);
      this.handleDisconnect(sessionId);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleMessage(sessionId: string, raw: string): Promise<void> {
    try {
      const msg: RoomMessage = JSON.parse(raw);
      const { type, payload } = msg;

      switch (type) {
        case EVENTS.ROOM.JOIN:
          this.handleJoin(sessionId, payload);
          break;
        case EVENTS.ROOM.LEAVE:
          this.handleLeave(sessionId);
          break;
        case EVENTS.SESSION.START:
          this.handleSessionStart(payload);
          break;
        case EVENTS.SESSION.LAYOUT:
          this.handleSessionLayout(payload);
          break;
        case EVENTS.SESSION.RESET:
          this.handleSessionReset();
          break;
        case EVENTS.SESSION.LIVE_VC:
          this.handleLiveVC(payload);
          break;
        case EVENTS.SESSION.LIVE_CAPTURE:
          this.handleLiveCapture();
          break;
        case EVENTS.WEBRTC.OFFER:
        case EVENTS.WEBRTC.ANSWER:
        case EVENTS.WEBRTC.CANDIDATE:
          this.handleWebRTC(sessionId, type, payload);
          break;
        case EVENTS.PHOTO.SEND:
          this.handlePhotoSend(sessionId, payload);
          break;
        case EVENTS.PHOTO.META:
          this.handlePhotoMeta(sessionId, payload);
          break;
        case EVENTS.PHOTO.TRANSFER_COMPLETE:
          this.handlePhotoTransferComplete(sessionId, payload);
          break;
        case EVENTS.LOCATION.UPDATE:
          this.handleLocation(sessionId, payload);
          break;
        case EVENTS.ROOM.GROUP_SIZE:
          this.handleGroupSize(payload);
          break;
        default:
          console.log('Unknown event type:', type);
      }
    } catch (err) {
      console.error('Message parse error:', err);
    }
  }

  private handleJoin(sessionId: string, payload?: { displayName?: string }): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const displayName = payload?.displayName?.trim() || 'Guest';
    const result = this.roomService.join(sessionId, displayName);

    if (!result.ok) {
      this.send(sessionId, EVENTS.ROOM.ERROR, { message: result.reason });
      return;
    }

    session.displayName = displayName;

    this.send(sessionId, EVENTS.ROOM.JOINED, { 
      participants: this.getParticipants(),
      selfId: sessionId 
    });
    this.broadcastExcept(sessionId, EVENTS.ROOM.JOINED, { 
      participants: this.getParticipants() 
    });
    this.broadcastRoomState();

    const snapshot = this.roomService.getSnapshot();
    if (this.roomService.getParticipantCount() >= snapshot.groupSize) {
      this.broadcast(EVENTS.ROOM.READY, { ready: true });
    }
  }

  private handleDisconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    const displayName = session?.displayName || 'Unknown';

    this.sessions.delete(sessionId);
    this.roomService.leave(sessionId);

    console.log(`[Room] ${displayName} (${sessionId}) disconnected`);

    if (this.sessions.size > 0) {
      this.broadcastParticipants();
      this.broadcastRoomState();
    }
  }

  private handleLeave(sessionId: string): void {
    this.handleDisconnect(sessionId);
    this.broadcast(EVENTS.SESSION.RESET, {});
  }

  private handleSessionStart(payload?: { layout?: string }): void {
    if (this.roomService.startSession(payload?.layout)) {
      this.broadcast(EVENTS.SESSION.START, {
        startTime: Date.now() + 1000,
        layout: payload?.layout
      });
      this.broadcastRoomState();
    }
  }

  private handleSessionLayout(payload?: string | { layout?: string }): void {
    const layout = typeof payload === 'string' ? payload : payload?.layout;
    if (this.roomService.updateLayout(layout)) {
      this.broadcast(EVENTS.SESSION.LAYOUT, layout);
      this.broadcastRoomState();
    }
  }

  private handleSessionReset(): void {
    this.roomService.resetSession();
    this.broadcast(EVENTS.SESSION.RESET, {});
    this.broadcastRoomState();
  }

  private handleLiveVC(payload?: { action?: 'start' | 'stop' }): void {
    const action = payload?.action;
    if (action !== 'start' && action !== 'stop') return;
    this.broadcast(EVENTS.SESSION.LIVE_VC, { action });
  }

  private handleLiveCapture(): void {
    this.broadcast(EVENTS.SESSION.LIVE_CAPTURE, {
      startTime: Date.now() + 400
    });
  }

  private handleWebRTC(sessionId: string, type: string, payload?: any): void {
    const { to, ...rest } = payload || {};
    if (to && this.sessions.has(to)) {
      this.send(to, type, { ...rest, from: sessionId });
    } else {
      this.broadcastExcept(sessionId, type, { ...rest, from: sessionId });
    }
  }

  private handlePhotoSend(sessionId: string, payload?: any): void {
    this.broadcastExcept(sessionId, EVENTS.PHOTO.RECEIVE, { ...payload, from: sessionId });
  }

  private handlePhotoMeta(sessionId: string, payload?: any): void {
    this.broadcastExcept(sessionId, EVENTS.PHOTO.META, { ...payload, from: sessionId });
  }

  private handlePhotoTransferComplete(sessionId: string, payload?: any): void {
    this.broadcastExcept(sessionId, EVENTS.PHOTO.TRANSFERRED, { ...payload, from: sessionId });
  }

  private handleLocation(sessionId: string, payload?: { lat?: number }): void {
    if (typeof payload?.lat === 'number') {
      this.broadcast(EVENTS.LOCATION.UPDATE, { from: sessionId, ...payload });
    }
  }

  private handleGroupSize(size: number): void {
    this.roomService.setGroupSize(size);
    this.broadcast(EVENTS.ROOM.GROUP_SIZE, size);
    this.broadcastRoomState();
  }

  private getParticipants() {
    return [...this.sessions.entries()]
      .filter(([_, session]) => session.displayName)
      .map(([id, session]) => ({ id, displayName: session.displayName as string }));
  }

  private broadcastParticipants(): void {
    this.broadcast(EVENTS.ROOM.JOINED, { participants: this.getParticipants() });
  }

  private broadcastRoomState(): void {
    const snapshot = this.roomService.getSnapshot();
    const entitlement = this.roomService.getEntitlement();
    this.broadcast(EVENTS.ROOM.STATE, { ...snapshot, entitlement });
  }

  private send(sessionId: string, type: string, payload: any): void {
    const session = this.sessions.get(sessionId);
    if (session?.ws?.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify({ type, payload }));
    }
  }

  private broadcast(type: string, payload: any): void {
    const msg = JSON.stringify({ type, payload });
    for (const session of this.sessions.values()) {
      if (session.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(msg);
      }
    }
  }

  private broadcastExcept(excludeId: string, type: string, payload: any): void {
    const msg = JSON.stringify({ type, payload });
    for (const [id, session] of this.sessions) {
      if (id !== excludeId && session.ws?.readyState === WebSocket.OPEN) {
        session.ws.send(msg);
      }
    }
  }
}
