import { Timestamp } from 'firebase/firestore';
import { PlanDay } from './plan.model';

export type PairStatus = 'pending' | 'active' | 'paused';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface ProposedPlan {
  title: string;
  startDate: string; // ISO date "2026-03-10"
  days: PlanDay[];
}

export interface PairDoc {
  id: string;
  userAId: string;
  userBId: string;
  userIds: string[]; // [userAId, userBId] — used for Firestore security rule `array-contains`
  status: PairStatus;
  pairName?: string;
  createdAt: Timestamp;
}

export interface PairInviteDoc {
  id: string;
  pairId: string;
  invitedEmail: string;
  invitedByUserId: string;
  status: InviteStatus;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  proposedPlan?: ProposedPlan;
}
