import type { Entitlement } from '../domain/entitlement';

export interface EntitlementProvider {
  getEntitlement(roomId: string): Entitlement;
}
