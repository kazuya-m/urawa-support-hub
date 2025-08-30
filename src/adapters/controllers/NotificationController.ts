import {
  NotificationExecutionInput,
  NotificationUseCase,
} from '@/application/usecases/NotificationUseCase.ts';
import { NotificationPresenter } from '@/adapters/presenters/NotificationPresenter.ts';
import { isValidNotificationType, NotificationType } from '@/domain/entities/NotificationTypes.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

interface CloudTaskRequestBody {
  ticketId: string;
  notificationType: string;
}

export class NotificationController {
  private notificationUseCase: NotificationUseCase;

  constructor() {
    this.notificationUseCase = new NotificationUseCase();
  }

  async handleSendNotification(req: Request): Promise<Response> {
    try {
      const isAuthenticated = this.validateCloudTasksRequest(req);
      if (!isAuthenticated) {
        return NotificationPresenter.toUnauthorizedResponse();
      }

      const requestBody = await this.parseRequestBody(req);
      if (!requestBody) {
        return NotificationPresenter.toBadRequestResponse('Invalid request body format');
      }

      const { ticketId, notificationType } = requestBody;

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
      return NotificationPresenter.toSuccessResponse(result);
    } catch (error) {
      if (error instanceof Error) {
        handleSupabaseError('send notification', error);
      }

      return NotificationPresenter.toErrorResponse(
        'Notification delivery failed',
        error instanceof Error ? error.message : String(error),
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
}
