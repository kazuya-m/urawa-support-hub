import { Notification } from '@/domain/entities/Notification.ts';
import { INotificationRepository } from '@/application/interfaces/repositories/INotificationRepository.ts';

export class MockNotificationRepository implements INotificationRepository {
  private notifications: Map<string, Notification> = new Map();

  async findById(id: string): Promise<Notification | null> {
    await Promise.resolve();
    return this.notifications.get(id) || null;
  }

  async findByTicketId(ticketId: string): Promise<Notification[]> {
    await Promise.resolve();
    return Array.from(this.notifications.values())
      .filter((notification) => notification.ticketId === ticketId);
  }

  async save(notification: Notification): Promise<void> {
    this.notifications.set(notification.id, notification);
    await Promise.resolve();
  }

  async update(notification: Notification): Promise<void> {
    this.notifications.set(notification.id, notification);
    await Promise.resolve();
  }

  // テスト用ヘルパーメソッド
  clear(): void {
    this.notifications.clear();
  }

  setNotifications(notifications: Notification[]): void {
    this.notifications.clear();
    notifications.forEach((notification) => this.notifications.set(notification.id, notification));
  }
}
