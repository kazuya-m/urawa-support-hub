import { Notification } from '@/domain/entities/index.ts';
import { NotificationInsert, NotificationRow } from '@/infrastructure/types/database.ts';

export class NotificationConverter {
  static toDomainEntity(data: NotificationRow): Notification {
    return new Notification({
      id: data.id,
      ticketId: data.ticket_id,
      notificationType: data.notification_type,
      scheduledAt: new Date(data.scheduled_at),
      sentAt: data.sent_at ? new Date(data.sent_at) : undefined,
      status: data.status,
      errorMessage: data.error_message ?? undefined,
      createdAt: new Date(data.created_at),
    });
  }

  static toDatabaseRow(notification: Notification): NotificationInsert {
    const plainObject = notification.toPlainObject();
    return {
      id: plainObject.id,
      ticket_id: plainObject.ticketId,
      notification_type: plainObject.notificationType,
      scheduled_at: plainObject.scheduledAt.toISOString(),
      sent_at: plainObject.sentAt?.toISOString(),
      status: plainObject.status,
      error_message: plainObject.errorMessage,
    };
  }
}
