import type { Entitlement } from './entitlement';

export type JoinDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export function canJoinRoom(
  participantCount: number,
  groupSize: number,
  entitlement: Entitlement
): JoinDecision {
  // 1. Enforce hard system cap
  if (participantCount >= entitlement.maxParticipants) {
    return {
      allowed: false,
      reason: `Room is full (System Limit: ${entitlement.maxParticipants})`
    };
  }

  // 2. Enforce specific user session cap (e.g. 2 for Duo, 4 for Group)
  if (participantCount >= groupSize) {
    return {
      allowed: false,
      reason: `Oops! Room capacity for this mode reached (${groupSize} max).`
    };
  }

  return { allowed: true };
}
