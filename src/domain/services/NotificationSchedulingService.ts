import { Ticket } from '@/domain/entities/Ticket.ts';
import {
  NOTIFICATION_TIMING_CONFIG,
  NotificationType,
} from '@/domain/config/NotificationConfig.ts';
import { INotificationSchedulingService } from '@/application/interfaces/services/INotificationSchedulingService.ts';

export interface NotificationTiming {
  type: NotificationType;
  scheduledTime: Date;
}

export class NotificationSchedulingService implements INotificationSchedulingService {
  /**
   * チケットの販売開始日から通知タイミングを計算
   * 3つのタイミング（前日、1時間前、15分前）での通知時刻を返す
   */
  calculateNotificationTimes(
    saleStartDate: Date | null,
    currentTime: Date = new Date(),
  ): NotificationTiming[] {
    if (!saleStartDate) return [];

    return Object.entries(NOTIFICATION_TIMING_CONFIG)
      .map(([type, config]) => ({
        type: type as NotificationType,
        scheduledTime: config.calculateScheduledTime(saleStartDate),
      }))
      .filter(({ scheduledTime }) => scheduledTime > currentTime);
  }

  /**
   * スケジューリング対象のチケットを抽出
   * 新規作成・更新の両方に対応
   */
  filterTicketsRequiringScheduling<T extends { ticket: Ticket; previousTicket?: Ticket }>(
    results: T[],
  ): T[] {
    return results.filter((result) => {
      const { ticket, previousTicket } = result;

      if (!previousTicket) {
        // 新規チケット: 通知スケジューリング対象かを判定
        return ticket.shouldScheduleNotification();
      }

      // 既存チケット: 再スケジューリング対象かを判定
      return ticket.shouldRescheduleNotification(previousTicket);
    });
  }
}
