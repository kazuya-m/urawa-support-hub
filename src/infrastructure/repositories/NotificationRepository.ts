import { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from '@/domain/entities/Notification.ts';
import { NotificationConverter } from './converters/NotificationConverter.ts';
import { isNotFoundError, throwDatabaseError } from '../utils/database-error-handler.ts';
import { INotificationRepository } from '@/application/interfaces/repositories/INotificationRepository.ts';

export class NotificationRepository implements INotificationRepository {
  constructor(
    private readonly client: SupabaseClient,
  ) {}

  async findById(id: string): Promise<Notification | null> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      throwDatabaseError('NotificationRepository', 'fetch notification', error);
    }
    return data ? NotificationConverter.toDomainEntity(data) : null;
  }

  async findByTicketId(ticketId: string): Promise<Notification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('notification_time', { ascending: true });

    if (error) throwDatabaseError('NotificationRepository', 'fetch notifications by ticket', error);
    return (data || []).map(NotificationConverter.toDomainEntity);
  }

  async save(notification: Notification): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .insert(NotificationConverter.toDatabaseRow(notification));

    if (error) throwDatabaseError('NotificationRepository', 'save notification', error);
  }

  async update(notification: Notification): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .update(NotificationConverter.toDatabaseRow(notification))
      .eq('id', notification.id);

    if (error) throwDatabaseError('NotificationRepository', 'update notification', error);
  }
}
