import { Notification } from '@/domain/entities/Notification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { INotificationRepository } from '@/application/interfaces/repositories/INotificationRepository.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';
import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import { LINE_MESSAGE_TEMPLATES } from '@/config/notification.ts';
import { formatMatchName } from '@/shared/utils/match.ts';
import type { NotificationExecutionInput } from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { ILineClient } from '@/infrastructure/clients/LineClient.ts';
import { formatJST } from '@/shared/utils/datetime.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ErrorCodes } from '@/shared/logging/ErrorCodes.ts';

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly lineClient: ILineClient,
  ) {}

  async sendScheduledNotification(input: NotificationExecutionInput): Promise<void> {
    const { ticketId, notificationType } = input;

    try {
      const ticket = await this.ticketRepository.findById(ticketId);
      if (!ticket) {
        const error = `Ticket not found: ${ticketId}`;
        throw new Error(error);
      }

      const existingHistories = await this.notificationRepository
        .findByTicketId(ticketId);

      let history = existingHistories.find((history) =>
        history.notificationType === notificationType
      );

      if (!history) {
        history = new Notification({
          id: crypto.randomUUID(),
          ticketId,
          notificationType,
          scheduledAt: new Date(),
          sentAt: null,
          status: 'scheduled',
          errorMessage: null,
          cloudTaskId: null,
          createdAt: new Date(),
          updatedAt: null,
        });
        await this.notificationRepository.save(history);
      }

      if (history.status === 'sent') {
        return;
      }

      const maxRetries = 3;
      let retryCount = 0;
      let lastError: Error | null = null;

      while (retryCount < maxRetries) {
        try {
          const lineMessage = LINE_MESSAGE_TEMPLATES.ticketNotification(
            formatMatchName(ticket),
            formatJST(ticket.matchDate, 'M/d(eeeee) HH:mm'),
            ticket.venue || '未定',
            ticket.saleStartDate ? formatJST(ticket.saleStartDate, 'M/d(eeeee) HH:mm') : '未定',
            notificationType,
            ticket.ticketUrl ?? undefined,
          );

          await this.lineClient.broadcast(lineMessage);

          const updatedHistory = history.markAsSent();
          await this.notificationRepository.update(updatedHistory);
          return;
        } catch (error) {
          lastError = error as Error;
          retryCount++;

          if (retryCount < maxRetries) {
            const delayMs = Math.pow(2, retryCount - 1) * 1000;
            await this.delay(delayMs);
          }
        }
      }

      if (lastError) {
        await this.handleFailedNotification(history, lastError);
      } else {
        await this.handleFailedNotification(
          history,
          new Error('Unknown notification error after retries'),
        );
      }
    } catch (error) {
      CloudLogger.error('Scheduled notification processing failed', {
        category: LogCategory.NOTIFICATION,
        context: {
          ticketId,
          stage: 'scheduled_notification',
        },
        error: toErrorInfo(error, ErrorCodes.NOTIFICATION_FAILED, false),
      });
      throw error;
    }
  }

  async handleFailedNotification(history: Notification, error: Error): Promise<void> {
    const failedHistory = history.markAsFailed(error.message);
    await this.notificationRepository.update(failedHistory);

    CloudLogger.error('Notification failed after maximum retries', {
      category: LogCategory.NOTIFICATION,
      context: {
        ticketId: history.ticketId,
        notificationId: history.id,
        stage: 'retry_exhausted',
      },
      error: toErrorInfo(error, ErrorCodes.MAX_RETRIES_EXCEEDED, false),
      metadata: {
        notificationType: history.getNotificationTypeDisplayName(),
        maxRetries: 3,
      },
    });
  }

  async sendTicketSummary(tickets: Ticket[]): Promise<void> {
    const message = LINE_MESSAGE_TEMPLATES.ticketSummary(tickets);

    try {
      await this.lineClient.broadcast(message);

      CloudLogger.info('Ticket summary notification sent successfully', {
        category: LogCategory.NOTIFICATION,
        context: { stage: 'ticket_summary_sent' },
        metadata: {
          ticketCount: tickets.length,
        },
      });
    } catch (error) {
      CloudLogger.error('Ticket summary notification failed', {
        category: LogCategory.NOTIFICATION,
        context: { stage: 'ticket_summary_error' },
        error: toErrorInfo(error, ErrorCodes.TICKET_SUMMARY_ERROR, false),
      });
      throw new Error(`Ticket summary notification failed: ${getErrorMessage(error)}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
