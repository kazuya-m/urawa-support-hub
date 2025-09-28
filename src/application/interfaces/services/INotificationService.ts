import { Ticket } from '@/domain/entities/Ticket.ts';
import type { NotificationExecutionInput } from '@/application/interfaces/usecases/INotificationUseCase.ts';

export interface INotificationService {
  sendScheduledNotification(input: NotificationExecutionInput): Promise<void>;
  sendTicketSummary(tickets: Ticket[]): Promise<void>;
}
