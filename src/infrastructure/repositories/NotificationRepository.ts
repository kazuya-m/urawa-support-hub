import { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from '@/domain/entities/Notification.ts';
import { NotificationConverter } from './converters/NotificationConverter.ts';
import { handleSupabaseError, isNotFoundError } from '../utils/error-handler.ts';
import { INotificationRepository } from '@/application/interfaces/repositories/INotificationRepository.ts';

export class NotificationRepository implements INotificationRepository {
  constructor(
    private readonly client: SupabaseClient,
  ) {}

  async findAll(): Promise<Notification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (error) handleSupabaseError('fetch notifications', error);
    return data.map(NotificationConverter.toDomainEntity);
  }

  async findById(id: string): Promise<Notification | null> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      handleSupabaseError('fetch notification', error);
    }
    return NotificationConverter.toDomainEntity(data);
  }

  async findByTicketId(ticketId: string): Promise<Notification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('scheduled_at', { ascending: true });

    if (error) handleSupabaseError('fetch notifications by ticket', error);
    return data.map(NotificationConverter.toDomainEntity);
  }

  async findByColumn(column: string, value: unknown): Promise<Notification[]> {
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq(column, value)
      .order('created_at', { ascending: true });

    if (error) handleSupabaseError(`fetch notifications by ${column}`, error);
    return data.map(NotificationConverter.toDomainEntity);
  }

  async findByDateRange(
    column: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Notification[]> {
    let query = this.client
      .from('notifications')
      .select('*');

    if (startDate) {
      query = query.gte(column, startDate.toISOString());
    }

    if (endDate) {
      query = query.lte(column, endDate.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) handleSupabaseError('fetch notifications by date range', error);
    return data.map(NotificationConverter.toDomainEntity);
  }

  async save(notification: Notification): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .insert(NotificationConverter.toDatabaseRow(notification));

    if (error) handleSupabaseError('save notification', error);
  }

  async update(notification: Notification): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .update(NotificationConverter.toDatabaseRow(notification))
      .eq('id', notification.id);

    if (error) handleSupabaseError('update notification', error);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) handleSupabaseError('delete notification', error);
  }
}
