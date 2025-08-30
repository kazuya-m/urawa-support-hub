import { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';
import { NotificationType } from '@/domain/entities/NotificationTypes.ts';

export interface NotificationExecutionInput {
  ticketId: string;
  notificationType: NotificationType;
}

export class NotificationUseCase {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async execute(input: NotificationExecutionInput): Promise<void> {
    const startTime = Date.now();

    try {
      await this.notificationService.processScheduledNotification(input);

      const executionTime = Date.now() - startTime;
      console.log('Scheduled notification completed successfully:', {
        ticketId: input.ticketId,
        notificationType: input.notificationType,
        executionTimeMs: executionTime,
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Scheduled notification failed:', {
        ticketId: input.ticketId,
        notificationType: input.notificationType,
        executionTimeMs: executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof Error) {
        handleSupabaseError('execute scheduled notification', error);
      }
      throw error;
    }
  }
}
