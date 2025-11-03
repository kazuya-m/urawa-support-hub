import { Notification } from '@/domain/entities/index.ts';
import { NotificationInsert, NotificationRow } from '@/infrastructure/types/database.ts';

export class NotificationConverter {
  static toDomainEntity(data: NotificationRow): Notification {
    return new Notification({
      id: data.id,
      ticketId: data.ticket_id,
      notificationType: data.notification_type,
      scheduledAt: new Date(data.notification_time),
      sentAt: data.sent_at ? new Date(data.sent_at) : null,
      status: data.status,
      errorMessage: data.error_message ?? null,
      cloudTaskId: data.cloud_task_id ?? null,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : null,
    });
  }

  static toDatabaseRow(notification: Notification): NotificationInsert {
    const plainObject = notification.toPlainObject();
    return {
      id: plainObject.id,
      ticket_id: plainObject.ticketId,
      notification_type: plainObject.notificationType,
      notification_time: plainObject.scheduledAt.toISOString(),
      sent_at: plainObject.sentAt?.toISOString() ?? null,
      status: plainObject.status,
      error_message: plainObject.errorMessage ?? null,
      cloud_task_id: plainObject.cloudTaskId ?? null,
    };
  }
}
