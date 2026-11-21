import {
  NOTIFICATION_TIMING_CONFIG,
  NOTIFICATION_TYPE_VALUES,
  type NotificationType,
} from '@/domain/config/NotificationConfig.ts';
import type { Ticket } from '@/domain/entities/Ticket.ts';

export function calculateNotificationTime(type: NotificationType, saleStartDate: Date): Date {
  return NOTIFICATION_TIMING_CONFIG[type].calculateScheduledTime(saleStartDate);
}

export function isWithinSendWindow(
  type: NotificationType,
  saleStartDate: Date,
  now: Date,
): boolean {
  const earliest = calculateNotificationTime(type, saleStartDate).getTime() -
    NOTIFICATION_TIMING_CONFIG[type].toleranceMs;
  return earliest <= now.getTime() && now.getTime() < saleStartDate.getTime();
}

export const SCHEDULING_HORIZON_MS = 48 * 60 * 60 * 1000;

export interface UpcomingNotification {
  ticketId: string;
  notificationType: NotificationType;
  notificationTime: Date;
}

export function listUpcomingNotifications(tickets: Ticket[], now: Date): UpcomingNotification[] {
  const horizon = now.getTime() + SCHEDULING_HORIZON_MS;
  return tickets.flatMap((ticket) => {
    const saleStartDate = ticket.saleStartDate;
    if (!saleStartDate || ticket.saleStatus !== 'before_sale') return [];
    if (ticket.matchDate.getTime() <= now.getTime()) return [];

    return NOTIFICATION_TYPE_VALUES
      .map((notificationType) => ({
        ticketId: ticket.id,
        notificationType,
        notificationTime: calculateNotificationTime(notificationType, saleStartDate),
      }))
      .filter(({ notificationTime }) =>
        now.getTime() < notificationTime.getTime() && notificationTime.getTime() <= horizon
      );
  });
}
