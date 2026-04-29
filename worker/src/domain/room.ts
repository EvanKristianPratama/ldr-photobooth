import { ROOM_STATES } from '../constants';
import type { RoomState } from '../constants';

export interface Participant {
  id: string;
  displayName: string;
}

export interface RoomSnapshot {
  participants: Participant[];
  state: RoomState;
  layout: string | null;
}

/**
 * Pure domain logic for room management.
 * No networking or storage concerns here.
 */
export class RoomEngine {
  private participants = new Map<string, Participant>();
  private state: RoomState = ROOM_STATES.IDLE;
  private layout: string | null = null;

  join(id: string, displayName: string): void {
    this.participants.set(id, { id, displayName });
  }

  leave(id: string): void {
    this.participants.delete(id);
    if (this.participants.size < 2) {
      this.state = ROOM_STATES.IDLE;
      this.layout = null;
    }
  }

  hasParticipant(id: string): boolean {
    return this.participants.has(id);
  }

  getParticipantCount(): number {
    return this.participants.size;
  }

  startSession(layout?: string): boolean {
    if (this.state !== ROOM_STATES.IDLE) return false;
    this.state = ROOM_STATES.SESSION;
    this.layout = layout ?? null;
    return true;
  }

  updateLayout(layout?: string): boolean {
    if (this.state !== ROOM_STATES.IDLE) return false;
    this.layout = layout ?? null;
    return true;
  }

  resetSession(): void {
    this.state = ROOM_STATES.IDLE;
    this.layout = null;
  }

  getState(): RoomSnapshot {
    return {
      participants: [...this.participants.values()],
      state: this.state,
      layout: this.layout
    };
  }
}
