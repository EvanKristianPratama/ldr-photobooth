// worker/src/room-do.js

import { RoomEngine } from './engine/RoomEngine.js';
import { EVENTS, MAX_PARTICIPANTS } from './constants.js';

/**
 * Durable Object class for room management.
 * Each room gets its own Durable Object instance.
 * Replaces in-memory RoomStore + Socket.IO room logic.
 */
export class RoomDurableObject {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = new Map(); // sessionId -> { ws, displayName }
        this.engine = new RoomEngine();
    }

    /**
     * Handle incoming fetch requests (WebSocket upgrades)
     */
    async fetch(request) {
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader !== 'websocket') {
            return new Response('Expected WebSocket upgrade', { status: 426 });
        }

        // Create WebSocket pair
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        // Generate unique session ID
        const sessionId = crypto.randomUUID();

        // Accept the WebSocket connection
        server.accept();
        this.sessions.set(sessionId, { ws: server, displayName: null });

        // Handle incoming messages
        server.addEventListener('message', async (event) => {
            await this.handleMessage(sessionId, event.data);
        });

        // Handle close
        server.addEventListener('close', () => {
            this.handleDisconnect(sessionId);
        });

        // Handle error
        server.addEventListener('error', (err) => {
            console.error('WebSocket error:', err);
            this.handleDisconnect(sessionId);
        });

        // Return the client end of the WebSocket pair
        return new Response(null, { status: 101, webSocket: client });
    }

    /**
     * Parse and route incoming messages
     */
    async handleMessage(sessionId, raw) {
        try {
            const msg = JSON.parse(raw);
            const { type, payload } = msg;

            console.log(`[Room] Event: ${type} from ${sessionId}`);

            switch (type) {
                case EVENTS.ROOM.JOIN:
                    this.handleJoin(sessionId, payload);
                    break;
                case EVENTS.ROOM.LEAVE:
                    this.handleLeave(sessionId);
                    break;
                case EVENTS.SESSION.START:
                    this.handleSessionStart(sessionId, payload);
                    break;
                case EVENTS.SESSION.LAYOUT:
                    this.handleSessionLayout(sessionId, payload);
                    break;
                case EVENTS.SESSION.RESET:
                    this.handleSessionReset(sessionId);
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
                default:
                    console.log('Unknown event type:', type);
            }
        } catch (err) {
            console.error('Message parse error:', err);
        }
    }

    /**
     * Handle room join
     */
    handleJoin(sessionId, { displayName }) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Check capacity
        const activeCount = this.getActiveParticipantCount();
        if (activeCount >= MAX_PARTICIPANTS) {
            this.send(sessionId, EVENTS.ROOM.ERROR, { message: 'Room is full (max 2 participants)' });
            return;
        }

        // Update session with display name
        session.displayName = displayName;
        this.engine.join(sessionId, displayName);

        console.log(`[Room] ${displayName} (${sessionId}) joined`);

        // Broadcast updated participants
        this.broadcastParticipants();

        // Check if room is ready (2 participants)
        const participants = this.getParticipants();
        if (participants.length >= MAX_PARTICIPANTS) {
            console.log('[Room] Room is ready!');
            this.broadcast(EVENTS.ROOM.READY, { ready: true });
        }
    }

    /**
     * Handle disconnect (socket close or error)
     */
    handleDisconnect(sessionId) {
        const session = this.sessions.get(sessionId);
        const displayName = session?.displayName || 'Unknown';

        this.sessions.delete(sessionId);
        this.engine.leave(sessionId);

        console.log(`[Room] ${displayName} (${sessionId}) disconnected`);

        // Broadcast updated participants to remaining users
        if (this.sessions.size > 0) {
            this.broadcastParticipants();
        }
    }

    /**
     * Handle explicit leave
     */
    handleLeave(sessionId) {
        this.handleDisconnect(sessionId);
        this.broadcast(EVENTS.SESSION.RESET, {});
    }

    /**
     * Handle session start
     */
    handleSessionStart(sessionId, payload) {
        if (this.engine.startSession(payload?.layout)) {
            console.log(`[Room] Session started with layout: ${payload?.layout}`);
            this.broadcast(EVENTS.SESSION.START, {
                startTime: Date.now() + 1000,
                layout: payload?.layout
            });
        }
    }

    /**
     * Handle layout selection
     */
    handleSessionLayout(sessionId, payload) {
        const layout = typeof payload === 'string' ? payload : payload?.layout;
        if (this.engine.updateLayout(layout)) {
            console.log(`[Room] Layout updated: ${layout}`);
            this.broadcast(EVENTS.SESSION.LAYOUT, layout);
        }
    }

    /**
     * Handle session reset
     */
    handleSessionReset(sessionId) {
        this.engine.resetSession();
        console.log('[Room] Session reset');
        this.broadcast(EVENTS.SESSION.RESET, {});
    }

    /**
     * Handle WebRTC signaling (relay to target peer)
     */
    handleWebRTC(sessionId, type, payload) {
        const { to, ...rest } = payload;
        if (to && this.sessions.has(to)) {
            console.log(`[Room] Relaying ${type} from ${sessionId} to ${to}`);
            this.send(to, type, { ...rest, from: sessionId });
        } else {
            // If no specific target, broadcast to all except sender
            this.broadcastExcept(sessionId, type, { ...rest, from: sessionId });
        }
    }

    /**
     * Handle photo send (relay to other participants)
     */
    handlePhotoSend(sessionId, payload) {
        console.log(`[Room] Relaying photo index ${payload?.index} from ${sessionId}`);
        this.broadcastExcept(sessionId, EVENTS.PHOTO.RECEIVE, { ...payload, from: sessionId });
    }

    /**
     * Handle photo meta (relay)
     */
    handlePhotoMeta(sessionId, payload) {
        this.broadcastExcept(sessionId, EVENTS.PHOTO.META, { ...payload, from: sessionId });
    }

    /**
     * Handle photo transfer complete (relay)
     */
    handlePhotoTransferComplete(sessionId, payload) {
        this.broadcastExcept(sessionId, EVENTS.PHOTO.TRANSFERRED, { ...payload, from: sessionId });
    }

    /**
     * Handle location update
     */
    handleLocation(sessionId, payload) {
        if (typeof payload?.lat === 'number') {
            this.broadcast(EVENTS.LOCATION.UPDATE, { from: sessionId, ...payload });
        }
    }

    // ==================== HELPERS ====================

    /**
     * Get active participants (those who have joined with displayName)
     */
    getParticipants() {
        return [...this.sessions.entries()]
            .filter(([_, s]) => s.displayName)
            .map(([id, s]) => ({ id, displayName: s.displayName }));
    }

    /**
     * Get count of active participants
     */
    getActiveParticipantCount() {
        return [...this.sessions.values()].filter(s => s.displayName).length;
    }

    /**
     * Broadcast participants list to all
     */
    broadcastParticipants() {
        this.broadcast(EVENTS.ROOM.JOINED, { participants: this.getParticipants() });
    }

    /**
     * Send message to specific session
     */
    send(sessionId, type, payload) {
        const session = this.sessions.get(sessionId);
        if (session?.ws?.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify({ type, payload }));
        }
    }

    /**
     * Broadcast message to all sessions
     */
    broadcast(type, payload) {
        const msg = JSON.stringify({ type, payload });
        for (const [_, session] of this.sessions) {
            if (session.ws?.readyState === WebSocket.OPEN) {
                session.ws.send(msg);
            }
        }
    }

    /**
     * Broadcast message to all except one session
     */
    broadcastExcept(excludeId, type, payload) {
        const msg = JSON.stringify({ type, payload });
        for (const [id, session] of this.sessions) {
            if (id !== excludeId && session.ws?.readyState === WebSocket.OPEN) {
                session.ws.send(msg);
            }
        }
    }
}
