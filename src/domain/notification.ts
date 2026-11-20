import {
  NOTIFICATION_TIMING_CONFIG,
  type NotificationType,
} from '@/domain/config/NotificationConfig.ts';

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
