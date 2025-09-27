import { NotificationResult } from '@/application/interfaces/results/UseCaseResults.ts';
import { NotificationType } from '@/domain/config/NotificationConfig.ts';

export interface NotificationExecutionInput {
  ticketId: string;
  notificationType: NotificationType;
}

export interface INotificationUseCase {
  execute(input: NotificationExecutionInput): Promise<NotificationResult>;
}
