import { Ticket } from '@/domain/entities/Ticket.ts';
import { NotificationType } from '@/domain/config/NotificationConfig.ts';

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
   * スケジューリング対象のチケットを抽出
   * 新規作成・更新の両方に対応
   */
  filterTicketsRequiringScheduling<T extends { ticket: Ticket; previousTicket?: Ticket }>(
    results: T[],
  ): T[];
}
