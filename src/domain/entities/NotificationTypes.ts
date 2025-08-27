/**
 * 通知タイプとタイミング設定の一元管理
 * Clean Architecture準拠: Domain層でビジネスルールを管理
 */

export const NOTIFICATION_TYPES = {
  DAY_BEFORE: 'day_before',
  HOUR_BEFORE: 'hour_before',
  MINUTES_BEFORE: 'minutes_before',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export interface NotificationTimingConfig {
  displayName: string;
  calculateScheduledTime: (saleStartDate: Date) => Date;
  toleranceMs: number;
  description: string;
}

/**
 * 通知タイミング設定
 * ⚠️ 運用中の値変更が高確率で発生するため、ここを変更するだけで全体に反映される設計
 */
export const NOTIFICATION_TIMING_CONFIG = {
  [NOTIFICATION_TYPES.DAY_BEFORE]: {
    displayName: '販売開始前日',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      const target = new Date(saleStartDate.getTime());
      target.setDate(target.getDate() - 1);

      const year = target.getFullYear();
      const month = target.getMonth();
      const date = target.getDate();
      return new Date(year, month, date, 20, 0, 0, 0);
    },
    toleranceMs: 5 * 60 * 1000, // ← ここだけ変更すれば全体に反映
    description: '販売開始日の前日20:00に通知（±5分の幅で送信）',
  },

  [NOTIFICATION_TYPES.HOUR_BEFORE]: {
    displayName: '販売開始1時間前',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 60 * 60 * 1000); // ← 30分前に変更したい場合は 30 * 60 * 1000
    },
    toleranceMs: 5 * 60 * 1000, // ← 許容範囲も簡単に変更可能
    description: '販売開始の1時間前に通知（±5分の幅で送信）',
  },

  [NOTIFICATION_TYPES.MINUTES_BEFORE]: {
    displayName: '販売開始15分前',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 15 * 60 * 1000); // ← 10分前に変更したい場合は 10 * 60 * 1000
    },
    toleranceMs: 2 * 60 * 1000, // ← 1分に縮めたい場合は 1 * 60 * 1000
    description: '販売開始の15分前に通知（±2分の幅で送信）',
  },
} as const satisfies Record<NotificationType, NotificationTimingConfig>;

export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPES);

/**
 * 設定駆動の通知判定
 * ビジネスルール: 指定時刻の許容範囲内で通知を送信するかを判定
 */
export function shouldSendNotificationAtTime(
  type: NotificationType,
  saleStartDate: Date,
  currentTime: Date,
): boolean {
  const config = NOTIFICATION_TIMING_CONFIG[type];
  if (!config) return false;

  const scheduledTime = config.calculateScheduledTime(saleStartDate);
  const timeDiff = Math.abs(currentTime.getTime() - scheduledTime.getTime());
  return timeDiff <= config.toleranceMs;
}

export function isValidNotificationType(value: string): value is NotificationType {
  return value in NOTIFICATION_TIMING_CONFIG;
}

export function getDisplayName(type: NotificationType): string {
  return NOTIFICATION_TIMING_CONFIG[type]?.displayName ?? type;
}

/**
 * 環境変数による設定オーバーライド（将来拡張用）
 * 例: NOTIFICATION_DAY_BEFORE_HOUR=18 で前日18時に変更
 */
export function getConfigWithEnvironmentOverrides(): typeof NOTIFICATION_TIMING_CONFIG {
  // 将来的に環境変数での設定上書きを実装可能
  return NOTIFICATION_TIMING_CONFIG;
}
