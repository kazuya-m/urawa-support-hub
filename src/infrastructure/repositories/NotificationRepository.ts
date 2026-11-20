import { SupabaseClient } from '@supabase/supabase-js';
import { Notification, type NotificationStatus } from '@/domain/entities/Notification.ts';
import type { NotificationType } from '@/domain/config/NotificationConfig.ts';
import type { LineMessage } from '@/infrastructure/clients/LineClient.ts';
import { NotificationConverter } from './converters/NotificationConverter.ts';
import { isNotFoundError, throwDatabaseError } from '../utils/database-error-handler.ts';

export interface NotificationKey {
  ticketId: string;
  notificationType: NotificationType;
  notificationTime: Date;
}

export interface ClaimedNotification {
  id: string;
  message: LineMessage;
  claimedAt: string;
}

const NOTIFICATION_KEY_COLUMNS = 'ticket_id,notification_type,notification_time';

export class NotificationRepository {
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
      .upsert(NotificationConverter.toDatabaseRow(notification), {
        onConflict: NOTIFICATION_KEY_COLUMNS,
        ignoreDuplicates: true,
      });

    if (error) throwDatabaseError('NotificationRepository', 'save notification', error);
  }

  async update(notification: Notification): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .update(NotificationConverter.toDatabaseRow(notification))
      .eq('id', notification.id);

    if (error) throwDatabaseError('NotificationRepository', 'update notification', error);
  }

  async claim(key: NotificationKey, message: LineMessage): Promise<ClaimedNotification | null> {
    const { data, error } = await this.client.rpc('claim_notification', {
      p_ticket_id: key.ticketId,
      p_notification_type: key.notificationType,
      p_notification_time: key.notificationTime.toISOString(),
      p_message: message,
    });

    if (error) throwDatabaseError('NotificationRepository', 'claim notification', error);
    const rows: { id: string; message: LineMessage; claimed_at: string }[] = data ?? [];
    const row = rows[0];
    return row ? { id: row.id, message: row.message, claimedAt: row.claimed_at } : null;
  }

  async findStatusByKey(key: NotificationKey): Promise<NotificationStatus | null> {
    const { data, error } = await this.client
      .from('notifications')
      .select('status')
      .eq('ticket_id', key.ticketId)
      .eq('notification_type', key.notificationType)
      .eq('notification_time', key.notificationTime.toISOString())
      .maybeSingle();

    if (error) throwDatabaseError('NotificationRepository', 'fetch notification status', error);
    return data?.status ?? null;
  }

  async markSent(claimed: ClaimedNotification, sentAt: Date): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .update({
        status: 'sent',
        sent_at: sentAt.toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimed.id)
      .eq('status', 'sending')
      .eq('claimed_at', claimed.claimedAt);

    if (error) throwDatabaseError('NotificationRepository', 'update notification as sent', error);
  }

  async markFailed(claimed: ClaimedNotification, errorMessage: string): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .update({
        status: 'failed',
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimed.id)
      .eq('status', 'sending')
      .eq('claimed_at', claimed.claimedAt);

    if (error) {
      throwDatabaseError('NotificationRepository', 'update notification as failed', error);
    }
  }
}
