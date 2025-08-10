import { NotificationHistory } from '../entities/NotificationHistory.ts';

export interface NotificationRepository {
  findAll(): Promise<NotificationHistory[]>;
  findById(id: string): Promise<NotificationHistory | null>;
  findByTicketId(ticketId: string): Promise<NotificationHistory[]>;
  findByColumn(column: string, value: unknown): Promise<NotificationHistory[]>;
  findByDateRange(column: string, startDate?: Date, endDate?: Date): Promise<NotificationHistory[]>;
  save(notification: NotificationHistory): Promise<void>;
  update(notification: NotificationHistory): Promise<void>;
  delete(id: string): Promise<void>;
}
