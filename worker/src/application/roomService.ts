import { canJoinRoom } from '../domain/accessPolicy';
import type { Entitlement } from '../domain/entitlement';
import type { RoomSnapshot } from '../domain/room';
import { RoomEngine } from '../domain/room';
import type { EntitlementProvider } from './entitlementProvider';

export interface JoinResult {
  ok: boolean;
  entitlement: Entitlement;
  reason?: string;
}

export class RoomService {
  constructor(
    private readonly roomId: string,
    private readonly engine: RoomEngine,
    private readonly entitlementProvider: EntitlementProvider
  ) {}

  getEntitlement(): Entitlement {
    return this.entitlementProvider.getEntitlement(this.roomId);
  }

  join(sessionId: string, displayName: string): JoinResult {
    const entitlement = this.getEntitlement();

    if (!this.engine.hasParticipant(sessionId)) {
      const decision = canJoinRoom(this.engine.getParticipantCount(), entitlement);
      if (!decision.allowed) {
        return { ok: false, reason: decision.reason, entitlement };
      }
    }

    this.engine.join(sessionId, displayName);
    return { ok: true, entitlement };
  }

  leave(sessionId: string): void {
    this.engine.leave(sessionId);
  }

  startSession(layout?: string): boolean {
    return this.engine.startSession(layout);
  }

  updateLayout(layout?: string): boolean {
    return this.engine.updateLayout(layout);
  }

  resetSession(): void {
    this.engine.resetSession();
  }

  getSnapshot(): RoomSnapshot {
    return this.engine.getState();
  }

  getParticipantCount(): number {
    return this.engine.getParticipantCount();
  }
}
