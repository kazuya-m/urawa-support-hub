import { Notification } from '@/domain/entities/Notification.ts';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  findByTicketId(ticketId: string): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
}
