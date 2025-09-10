import {
  INotificationUseCase,
  NotificationExecutionInput,
} from '@/application/interfaces/usecases/INotificationUseCase.ts';
import { NotificationPresenter } from '@/adapters/presenters/NotificationPresenter.ts';
import { isValidNotificationType, NotificationType } from '@/domain/entities/NotificationTypes.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';
import { DISCORD_EMBED_TEMPLATES, getNotificationConfig } from '@/config/notification.ts';

interface CloudTaskRequestBody {
  ticketId: string;
  notificationType: string;
}

export class NotificationController {
  constructor(
    private readonly notificationUseCase: INotificationUseCase,
  ) {}

  async handleSendNotification(req: Request): Promise<Response> {
    const startTime = Date.now();
    let ticketId: string | undefined;
    let notificationType: string | undefined;

    try {
      const isAuthenticated = this.validateCloudTasksRequest(req);
      if (!isAuthenticated) {
        return NotificationPresenter.toUnauthorizedResponse();
      }

      const requestBody = await this.parseRequestBody(req);
      if (!requestBody) {
        return NotificationPresenter.toBadRequestResponse('Invalid request body format');
      }

      ticketId = requestBody.ticketId;
      notificationType = requestBody.notificationType;

      if (!ticketId || typeof ticketId !== 'string') {
        return NotificationPresenter.toBadRequestResponse(
          'ticketId is required and must be a string',
        );
      }

      if (!isValidNotificationType(notificationType)) {
        return NotificationPresenter.toBadRequestResponse(
          `Invalid notificationType: ${notificationType}`,
        );
      }

      const inputData: NotificationExecutionInput = {
        ticketId,
        notificationType: notificationType as NotificationType,
      };

      const result = await this.notificationUseCase.execute(inputData);

      const _executionTime = Date.now() - startTime;

      // エラー結果の場合は適切なエラーレスポンスを返す
      if (result.status === 'error') {
        return NotificationPresenter.toErrorResponse(
          'Notification processing failed',
          {
            ticketId: result.ticketId,
            notificationType: result.notificationType,
            errorMessage: result.errorMessage,
            executionTimeMs: result.executionDurationMs,
          },
          500,
        );
      }

      return NotificationPresenter.toSuccessResponse(result);
    } catch (error) {
      const _executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (error instanceof Error) {
        handleSupabaseError('send notification', error);
      }

      // Discord エラー通知を送信
      this.sendDiscordErrorAlert({
        operation: 'Cloud Tasks→Cloud Run notification processing',
        ticketId,
        notificationType,
        error: errorMessage,
        executionTimeMs: _executionTime,
      }).catch((_alertError) => {
      });

      return NotificationPresenter.toErrorResponse(
        'Notification delivery failed',
        errorMessage,
        500,
      );
    }
  }

  private validateCloudTasksRequest(req: Request): boolean {
    const authHeader = req.headers.get('Authorization');

    if (Deno.env.get('NODE_ENV') !== 'production') {
      return true;
    }

    // Cloud Tasks uses OIDC token or service account authentication
    return !!authHeader && (
      authHeader.startsWith('Bearer ') ||
      authHeader.startsWith('OAuth ')
    );
  }

  private async parseRequestBody(req: Request): Promise<CloudTaskRequestBody | null> {
    try {
      const body = await req.json();
      return body as CloudTaskRequestBody;
    } catch {
      return null;
    }
  }

  private async sendDiscordErrorAlert(errorData: {
    operation: string;
    ticketId?: string;
    notificationType?: string;
    error: string;
    executionTimeMs: number;
  }): Promise<void> {
    try {
      const config = getNotificationConfig();

      const details = [
        `Operation: ${errorData.operation}`,
        errorData.ticketId ? `Ticket ID: ${errorData.ticketId}` : null,
        errorData.notificationType ? `Notification Type: ${errorData.notificationType}` : null,
        `Execution Time: ${errorData.executionTimeMs}ms`,
        `Error: ${errorData.error}`,
      ].filter(Boolean).join('\n');

      const embed = DISCORD_EMBED_TEMPLATES.errorNotification(
        '🚨 Cloud Tasks→Cloud Run 通知エラー',
        details,
      );

      await fetch(config.discord.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(embed),
      });
    } catch {
      // Ignore Discord errors
    }
  }
}
