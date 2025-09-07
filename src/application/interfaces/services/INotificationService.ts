import { Notification } from '@/domain/entities/Notification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { NotificationExecutionInput } from '@/application/interfaces/usecases/INotificationUseCase.ts';

export interface INotificationService {
  processScheduledNotification(input: NotificationExecutionInput): Promise<void>;
  processPendingNotifications(): Promise<void>;
  sendNotification(history: Notification, ticket: Ticket): Promise<void>;
}
