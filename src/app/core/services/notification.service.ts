import { Injectable, inject, signal, computed } from '@angular/core';
import { orderBy, limit, where } from '@angular/fire/firestore';
import { Timestamp } from 'firebase/firestore';
import { FirestoreService } from './firestore.service';
import { InAppNotification, NotificationType } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private fs = inject(FirestoreService);
  private unsubscribe: (() => void) | null = null;

  readonly notifications = signal<InAppNotification[]>([]);

  readonly unreadCount = computed(
    () => this.notifications().filter(n => !n.read).length
  );

  watchNotifications(userId: string): void {
    this.unsubscribe?.();
    this.unsubscribe = this.fs.onCollectionSnapshot<InAppNotification>(
      `users/${userId}/notifications`,
      (data) => this.notifications.set(data),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.fs.update(`users/${userId}/notifications/${notificationId}`, { read: true });
  }

  async markAllRead(userId: string): Promise<void> {
    const unread = this.notifications().filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = this.fs.batch();
    for (const n of unread) {
      batch.update(this.fs.doc(`users/${userId}/notifications/${n.id}`), { read: true });
    }
    await batch.commit();
  }

  async createNotification(
    userId: string,
    pairId: string,
    type: NotificationType,
  ): Promise<void> {
    const { title, body } = this.getText(type);
    const id = crypto.randomUUID();
    const notification: Omit<InAppNotification, 'id'> = {
      userId,
      pairId,
      type,
      title,
      body,
      read: false,
      createdAt: Timestamp.now(),
    };
    await this.fs.set(`users/${userId}/notifications/${id}`, notification as Record<string, unknown>);
  }

  stopWatching(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  getText(type: NotificationType): { title: string; body: string } {
    switch (type) {
      case 'workout_ready':
        return { title: 'Workout Ready', body: "Today's workout has been generated. Let's go!" };
      case 'partner_completed':
        return { title: 'Partner Finished', body: 'Your partner completed their workout. Your turn!' };
      case 'sign_off_pending':
        return { title: 'Sign-Off Needed', body: "Your partner is waiting for you to sign off on today's session." };
      case 'streak_expiring':
        return { title: 'Streak Expiring', body: 'Complete a workout today to keep your streak alive!' };
      case 'medal_close':
        return { title: 'Medal Within Reach', body: "You're close to unlocking a new achievement!" };
      case 'nudge_received':
        return { title: 'Nudge Received', body: 'Your partner gave you a nudge. Time to move!' };
      case 'weekly_recap':
        return { title: 'Weekly Recap', body: 'Check out how you and your partner did this week.' };
      case 'reaction_received':
        return { title: 'Reaction Received', body: 'Your partner reacted to your workout!' };
    }
  }
}
