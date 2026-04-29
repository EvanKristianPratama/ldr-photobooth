import type { Entitlement } from './entitlement';

export type JoinDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export function canJoinRoom(
  participantCount: number,
  entitlement: Entitlement
): JoinDecision {
  if (participantCount >= entitlement.maxParticipants) {
    return {
      allowed: false,
      reason: `Room is full (max ${entitlement.maxParticipants} participants)`
    };
  }

  return { allowed: true };
}
