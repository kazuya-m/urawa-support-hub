import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import { NotificationResult } from '@/application/types/UseCaseResults.ts';
import {
  INotificationUseCase,
  NotificationExecutionInput,
} from '@/application/interfaces/usecases/INotificationUseCase.ts';

export class NotificationUseCase implements INotificationUseCase {
  constructor(
    private readonly notificationService: INotificationService,
  ) {}

  async execute(input: NotificationExecutionInput): Promise<NotificationResult> {
    const startTime = Date.now();

    try {
      await this.notificationService.processScheduledNotification(input);

      const executionTime = Date.now() - startTime;

      return {
        status: 'success',
        ticketId: input.ticketId,
        notificationType: input.notificationType,
        executionDurationMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Scheduled notification failed:', {
        ticketId: input.ticketId,
        notificationType: input.notificationType,
        executionTimeMs: executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'error',
        ticketId: input.ticketId,
        notificationType: input.notificationType,
        executionDurationMs: executionTime,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
