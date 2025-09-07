import { NotificationResult } from '@/application/types/UseCaseResults.ts';
import { NotificationType } from '@/domain/entities/NotificationTypes.ts';

export interface NotificationExecutionInput {
  ticketId: string;
  notificationType: NotificationType;
}

export interface INotificationUseCase {
  execute(input: NotificationExecutionInput): Promise<NotificationResult>;
}
