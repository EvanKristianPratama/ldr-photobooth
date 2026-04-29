export interface Entitlement {
  vipActive: boolean;
  maxParticipants: number;
  validFrom?: number;
  validTo?: number;
  allowedDays?: number[];
}
