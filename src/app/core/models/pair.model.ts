import { Timestamp } from 'firebase/firestore';

export type PairStatus = 'pending' | 'active' | 'paused';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

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
}
