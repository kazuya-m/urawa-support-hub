import { Notification } from '@/domain/entities/Notification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { INotificationRepository } from '@/application/interfaces/repositories/INotificationRepository.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';
import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import { LINE_MESSAGE_TEMPLATES } from '@/config/notification.ts';
import { formatMatchName } from '@/shared/utils/match.ts';
import type { NotificationExecutionInput } from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { NotificationType } from '@/domain/entities/NotificationTypes.ts';
import { ILineClient } from '@/infrastructure/clients/LineClient.ts';
import { formatJST } from '@/shared/utils/datetime.ts';

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly ticketRepository: ITicketRepository,
    private readonly lineClient: ILineClient,
  ) {}

  async processScheduledNotification(input: NotificationExecutionInput): Promise<void> {
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
          status: 'scheduled',
          createdAt: new Date(),
        });
        await this.notificationRepository.save(history);
      }

      if (history.status === 'sent') {
        return;
      }

      await this.sendNotification(history, ticket);
    } catch (error) {
      console.error(
        `Scheduled notification processing failed for ticket ${ticketId}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async processPendingNotifications(): Promise<void> {
    const currentTime = new Date();
    const scheduledNotifications = await this.notificationRepository
      .findByColumn('status', 'scheduled');

    const dueNotifications = scheduledNotifications.filter((notification) =>
      notification.canBeSent(currentTime)
    );

    for (const notification of dueNotifications) {
      try {
        const ticket = await this.ticketRepository.findById(notification.ticketId);
        if (!ticket) {
          continue;
        }

        await this.sendNotification(notification, ticket);
      } catch (error) {
        await this.handleFailedNotification(notification, error as Error);
      }
    }
  }

  async sendNotification(history: Notification, ticket: Ticket): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        await this.sendTicketNotification(ticket, history.notificationType);
        const updatedHistory = history.markAsSent();
        await this.notificationRepository.update(updatedHistory);
        return;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s, 4s
          await this.delay(delayMs);
        }
      }
    }

    // 最後のエラーが確実に存在することを確認
    if (lastError) {
      await this.handleFailedNotification(history, lastError);
    } else {
      // 理論的には起こりえないが、型安全性のため
      await this.handleFailedNotification(
        history,
        new Error('Unknown notification error after retries'),
      );
    }
  }

  private async sendTicketNotification(
    ticket: Ticket,
    notificationType: NotificationType,
  ): Promise<void> {
    const lineMessage = LINE_MESSAGE_TEMPLATES.ticketNotification(
      formatMatchName(ticket),
      formatJST(ticket.matchDate, 'M/d(eeeee) HH:mm'),
      ticket.venue || '未定',
      ticket.saleStartDate ? formatJST(ticket.saleStartDate, 'M/d(eeeee) HH:mm') : '未定',
      notificationType,
      ticket.ticketUrl,
    );

    try {
      await this.lineClient.broadcast(lineMessage);
    } catch (error) {
      throw new Error(
        `LINE notification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async handleFailedNotification(history: Notification, error: Error): Promise<void> {
    const failedHistory = history.markAsFailed(error.message);
    await this.notificationRepository.update(failedHistory);

    console.error(
      `Notification failed after ${3} retries - Ticket: ${history.ticketId}, Type: ${history.getNotificationTypeDisplayName()}, Error: ${error.message}`,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
