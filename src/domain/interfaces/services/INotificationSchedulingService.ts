import { Ticket } from '@/domain/entities/Ticket.ts';
import { NotificationType } from '@/domain/entities/NotificationTypes.ts';

export interface NotificationTiming {
  type: NotificationType;
  scheduledTime: Date;
}

export interface INotificationSchedulingService {
  /**
   * チケットの販売開始日から通知タイミングを計算
   * 3つのタイミング（前日、1時間前、15分前）での通知時刻を返す
   */
  calculateNotificationTimes(
    saleStartDate: Date | null,
    currentTime?: Date,
  ): NotificationTiming[];

  /**
   * チケットが通知スケジューリング対象かどうか判定
   * ドメインルールに基づく判定
   */
  shouldScheduleNotification(ticket: Ticket): boolean;

  /**
   * 既存チケットが再スケジューリング対象かどうか判定
   * saleStartDate変更等による再スケジューリング判定
   */
  shouldRescheduleNotification(ticket: Ticket, previousTicket?: Ticket): boolean;

  /**
   * スケジューリング対象のチケットを抽出
   * 新規作成・更新の両方に対応
   */
  filterTicketsRequiringScheduling<T extends { ticket: Ticket; previousTicket?: Ticket }>(
    results: T[],
  ): T[];
}
