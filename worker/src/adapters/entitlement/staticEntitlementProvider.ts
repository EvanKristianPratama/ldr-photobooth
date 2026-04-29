import { MAX_FREE_PARTICIPANTS } from '../../constants';
import type { EntitlementProvider } from '../../application/entitlementProvider';
import type { Entitlement } from '../../domain/entitlement';

export class StaticEntitlementProvider implements EntitlementProvider {
  getEntitlement(_roomId: string): Entitlement {
    return {
      vipActive: false,
      maxParticipants: MAX_FREE_PARTICIPANTS
    };
  }
}
