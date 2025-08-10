/**
 * 通知タイプの一元管理
 * 新しいタイプ追加時はここだけを修正すれば全体に反映される
 */
export const NOTIFICATION_TYPES = {
  DAY_BEFORE: 'day_before',
  HOUR_BEFORE: 'hour_before', 
  MINUTES_BEFORE: 'minutes_before'
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

/**
 * 通知タイプ設定の一元管理
 * 時刻・時間・許容範囲をここで管理
 */
export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.DAY_BEFORE]: {
    displayName: '販売開始前日',
    getScheduledTime: (saleStartDate: Date): Date => {
      const dayBefore = new Date(saleStartDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0);
      return dayBefore;
    },
    toleranceMs: 5 * 60 * 1000 // 5分
  },
  [NOTIFICATION_TYPES.HOUR_BEFORE]: {
    displayName: '販売開始1時間前',
    getScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 60 * 60 * 1000);
    },
    toleranceMs: 5 * 60 * 1000 // 5分
  },
  [NOTIFICATION_TYPES.MINUTES_BEFORE]: {
    displayName: '販売開始15分前',
    getScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 15 * 60 * 1000);
    },
    toleranceMs: 2 * 60 * 1000 // 2分
  }
} as const;

export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPES);

/**
 * 通知タイプのバリデーション
 */
export function isValidNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPE_VALUES.includes(value as NotificationType);
}

/**
 * 表示名取得のユーティリティ
 */
export function getNotificationTypeDisplayName(type: NotificationType): string {
  return NOTIFICATION_CONFIG[type].displayName;
}