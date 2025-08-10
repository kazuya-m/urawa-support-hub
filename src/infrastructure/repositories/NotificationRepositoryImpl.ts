import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationRepository } from '@/domain/interfaces/NotificationRepository.ts';
import { NotificationHistory } from '@/domain/entities/NotificationHistory.ts';
import { NotificationConverter } from './converters/NotificationConverter.ts';
import { handleSupabaseError, isNotFoundError } from '../utils/error-handler.ts';

export class NotificationRepositoryImpl implements NotificationRepository {
  constructor(private client: SupabaseClient) {}

  async findAll(): Promise<NotificationHistory[]> {
    const { data, error } = await this.client
      .from('notification_history')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (error) handleSupabaseError('fetch notifications', error);
    return data.map(NotificationConverter.toDomainEntity);
  }

  async findById(id: string): Promise<NotificationHistory | null> {
    const { data, error } = await this.client
      .from('notification_history')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      handleSupabaseError('fetch notification', error);
    }
    return NotificationConverter.toDomainEntity(data);
  }

  async findByTicketId(ticketId: string): Promise<NotificationHistory[]> {
    const { data, error } = await this.client
      .from('notification_history')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('scheduled_at', { ascending: true });

    if (error) handleSupabaseError('fetch notifications by ticket', error);
    return data.map(NotificationConverter.toDomainEntity);
  }

  async findByColumn(column: string, value: unknown): Promise<NotificationHistory[]> {
    const { data, error } = await this.client
      .from('notification_history')
      .select('*')
      .eq(column, value)
      .order('created_at', { ascending: true });

    if (error) handleSupabaseError(`fetch notifications by ${column}`, error);
    return data.map(NotificationConverter.toDomainEntity);
  }

  async findByDateRange(column: string, startDate?: Date, endDate?: Date): Promise<NotificationHistory[]> {
    let query = this.client
      .from('notification_history')
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

  async save(notification: NotificationHistory): Promise<void> {
    const { error } = await this.client
      .from('notification_history')
      .insert(NotificationConverter.toDatabaseRow(notification));

    if (error) handleSupabaseError('save notification', error);
  }

  async update(notification: NotificationHistory): Promise<void> {
    const { error } = await this.client
      .from('notification_history')
      .update(NotificationConverter.toDatabaseRow(notification))
      .eq('id', notification.id);

    if (error) handleSupabaseError('update notification', error);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('notification_history')
      .delete()
      .eq('id', id);

    if (error) handleSupabaseError('delete notification', error);
  }

}