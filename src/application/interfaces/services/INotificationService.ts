import { Ticket } from '@/domain/entities/Ticket.ts';
import type { NotificationExecutionInput } from '@/application/usecases/results.ts';

export interface INotificationService {
  sendScheduledNotification(input: NotificationExecutionInput): Promise<void>;
  sendTicketSummary(tickets: Ticket[]): Promise<void>;
}
