import { NotificationHistory } from '@/domain/entities/NotificationHistory.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { NotificationRepositoryImpl } from '@/infrastructure/repositories/NotificationRepositoryImpl.ts';
import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import {
  DISCORD_EMBED_TEMPLATES,
  getNotificationConfig,
  LINE_MESSAGE_TEMPLATES,
} from '@/infrastructure/config/notification.ts';
import type { NotificationExecutionInput } from '@/application/usecases/NotificationUseCase.ts';

export class NotificationService {
  private notificationRepository: NotificationRepositoryImpl;
  private ticketRepository: TicketRepositoryImpl;

  constructor() {
    this.notificationRepository = new NotificationRepositoryImpl();
    this.ticketRepository = new TicketRepositoryImpl();
  }

  async processScheduledNotification(input: NotificationExecutionInput): Promise<void> {
    const { ticketId, notificationType } = input;

    try {
      const ticket = await this.ticketRepository.findById(ticketId);
      if (!ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      const existingHistories = await this.notificationRepository
        .findByTicketId(ticketId);

      let history = existingHistories.find((h) => h.notificationType === notificationType);

      if (!history) {
        history = new NotificationHistory({
          id: crypto.randomUUID(),
          ticketId,
          notificationType,
          scheduledAt: new Date(),
          status: 'pending',
          createdAt: new Date(),
        });
        await this.notificationRepository.save(history);
      }

      if (history.status === 'sent') {
        console.log('Notification already sent:', { ticketId, notificationType });
        return;
      }

      await this.sendNotification(history, ticket);
    } catch (error) {
      console.error('Scheduled notification processing failed:', error);
      await this.sendErrorNotification(
        `Scheduled notification processing failed for ticket ${ticketId}`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async processPendingNotifications(): Promise<void> {
    const currentTime = new Date();
    const pendingNotifications = await this.notificationRepository
      .findByColumn('status', 'pending');

    const dueNotifications = pendingNotifications.filter((notification) =>
      notification.canBeSent(currentTime)
    );

    for (const notification of dueNotifications) {
      try {
        const ticket = await this.ticketRepository.findById(notification.ticketId);
        if (!ticket) {
          console.warn(`Ticket not found for notification: ${notification.id}`);
          continue;
        }

        await this.sendNotification(notification, ticket);
      } catch (error) {
        console.error('Failed to process pending notification:', {
          notificationId: notification.id,
          error: error instanceof Error ? error.message : String(error),
        });
        await this.handleFailedNotification(notification, error as Error);
      }
    }
  }

  async sendNotification(history: NotificationHistory, ticket: Ticket): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        await this.performNotificationSend(history, ticket);
        const updatedHistory = history.markAsSent();
        await this.notificationRepository.update(updatedHistory);
        return;
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s, 4s
          console.log(`Retry ${retryCount}/${maxRetries} after ${delayMs}ms:`, {
            notificationId: history.id,
            error: lastError.message,
          });
          await this.delay(delayMs);
        }
      }
    }

    await this.handleFailedNotification(history, lastError!);
  }

  private async performNotificationSend(
    history: NotificationHistory,
    ticket: Ticket,
  ): Promise<void> {
    const config = getNotificationConfig();

    const lineMessage = LINE_MESSAGE_TEMPLATES.ticketNotification(
      ticket.matchName,
      ticket.matchDate.toLocaleString('ja-JP'),
      ticket.venue,
      ticket.saleStartDate.toLocaleString('ja-JP'),
      ticket.ticketUrl,
    );

    const discordEmbed = DISCORD_EMBED_TEMPLATES.ticketNotification(
      ticket.matchName,
      ticket.matchDate.toLocaleString('ja-JP'),
      ticket.venue,
      ticket.saleStartDate.toLocaleString('ja-JP'),
      ticket.ticketUrl,
    );

    const [lineResponse, discordResponse] = await Promise.allSettled([
      this.sendLineMessage(config.line.channelAccessToken, lineMessage),
      this.sendDiscordMessage(config.discord.webhookUrl, discordEmbed),
    ]);

    const lineSuccess = lineResponse.status === 'fulfilled' && lineResponse.value.ok;
    const discordSuccess = discordResponse.status === 'fulfilled' && discordResponse.value.ok;

    if (!lineSuccess || !discordSuccess) {
      const errors: string[] = [];
      if (!lineSuccess) {
        const error = lineResponse.status === 'rejected'
          ? lineResponse.reason
          : `LINE API error: ${lineResponse.value.status}`;
        errors.push(`LINE: ${error}`);
      }
      if (!discordSuccess) {
        const error = discordResponse.status === 'rejected'
          ? discordResponse.reason
          : `Discord API error: ${discordResponse.value.status}`;
        errors.push(`Discord: ${error}`);
      }
      throw new Error(`Notification failed: ${errors.join(', ')}`);
    }

    console.log('Notification sent successfully:', {
      notificationId: history.id,
      type: history.notificationType,
      match: ticket.matchName,
    });
  }

  private sendLineMessage(
    accessToken: string,
    message: Record<string, unknown>,
  ): Promise<Response> {
    return fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [message],
      }),
    });
  }

  private sendDiscordMessage(
    webhookUrl: string,
    embed: Record<string, unknown>,
  ): Promise<Response> {
    return fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embed),
    });
  }

  async handleFailedNotification(history: NotificationHistory, error: Error): Promise<void> {
    const failedHistory = history.markAsFailed(error.message);
    await this.notificationRepository.update(failedHistory);

    await this.sendErrorNotification(
      `Notification failed after ${3} retries`,
      `Ticket: ${history.ticketId}, Type: ${history.getNotificationTypeDisplayName()}, Error: ${error.message}`,
    );
  }

  private async sendErrorNotification(error: string, details: string): Promise<void> {
    try {
      const config = getNotificationConfig();
      const embed = DISCORD_EMBED_TEMPLATES.errorNotification(error, details);
      await this.sendDiscordMessage(config.discord.webhookUrl, embed);
    } catch (discordError) {
      console.error('Failed to send error notification to Discord:', discordError);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
