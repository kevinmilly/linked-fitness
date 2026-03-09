import { Timestamp } from 'firebase/firestore';

export type NotificationType =
  | 'workout_ready'
  | 'partner_completed'
  | 'sign_off_pending'
  | 'streak_expiring'
  | 'medal_close'
  | 'nudge_received'
  | 'weekly_recap'
  | 'reaction_received';

export interface InAppNotification {
  id: string;
  userId: string;
  pairId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Timestamp;
}
