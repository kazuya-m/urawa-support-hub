import { Notification } from '@/domain/entities/Notification.ts';

export interface INotificationRepository {
  findAll(): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  findByTicketId(ticketId: string): Promise<Notification[]>;
  findByColumn(column: string, value: unknown): Promise<Notification[]>;
  findByDateRange(column: string, startDate?: Date, endDate?: Date): Promise<Notification[]>;
  save(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
  delete(id: string): Promise<void>;
}
