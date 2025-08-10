/**
 * 通知設定の完全外部化
 * 運用中の値変更に対応するための設定駆動設計
 */

export interface NotificationTimingConfig {
  /** 表示名 */
  displayName: string;
  /** スケジュール時刻計算ロジック */
  calculateScheduledTime: (saleStartDate: Date) => Date;
  /** 許容時間差（ミリ秒） */
  toleranceMs: number;
  /** 説明（運用・デバッグ用） */
  description: string;
}

/**
 * 通知タイミング設定
 * ⚠️ 運用中の値変更が高確率で発生するため、ここを変更するだけで全体に反映される設計
 */
export const NOTIFICATION_TIMING_CONFIG = {
  day_before: {
    displayName: '販売開始前日',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      const target = new Date(saleStartDate);
      target.setDate(target.getDate() - 1);
      target.setHours(20, 0, 0, 0); // ← ここだけ変更すれば全体に反映
      return target;
    },
    toleranceMs: 5 * 60 * 1000, // ← ここだけ変更すれば全体に反映
    description: '販売開始日の前日20:00に通知（±5分の幅で送信）'
  },
  
  hour_before: {
    displayName: '販売開始1時間前',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 60 * 60 * 1000); // ← 30分前に変更したい場合は 30 * 60 * 1000
    },
    toleranceMs: 5 * 60 * 1000, // ← 許容範囲も簡単に変更可能
    description: '販売開始の1時間前に通知（±5分の幅で送信）'
  },
  
  minutes_before: {
    displayName: '販売開始15分前', 
    calculateScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 15 * 60 * 1000); // ← 10分前に変更したい場合は 10 * 60 * 1000
    },
    toleranceMs: 2 * 60 * 1000, // ← 1分に縮めたい場合は 1 * 60 * 1000
    description: '販売開始の15分前に通知（±2分の幅で送信）'
  }
} as const satisfies Record<string, NotificationTimingConfig>;

export type NotificationType = keyof typeof NOTIFICATION_TIMING_CONFIG;

/**
 * 設定駆動の通知判定
 */
export function shouldSendNotificationAtTime(
  type: NotificationType,
  saleStartDate: Date,
  currentTime: Date
): boolean {
  const config = NOTIFICATION_TIMING_CONFIG[type];
  if (!config) return false;
  
  const scheduledTime = config.calculateScheduledTime(saleStartDate);
  const timeDiff = Math.abs(currentTime.getTime() - scheduledTime.getTime());
  return timeDiff <= config.toleranceMs;
}

/**
 * 表示名取得
 */
export function getDisplayName(type: NotificationType): string {
  return NOTIFICATION_TIMING_CONFIG[type]?.displayName ?? type;
}

/**
 * バリデーション
 */
export function isValidNotificationType(value: string): value is NotificationType {
  return value in NOTIFICATION_TIMING_CONFIG;
}

/**
 * 環境変数による設定オーバーライド（将来拡張用）
 * 例: NOTIFICATION_DAY_BEFORE_HOUR=18 で前日18時に変更
 */
export function getConfigWithEnvironmentOverrides(): typeof NOTIFICATION_TIMING_CONFIG {
  // 将来的に環境変数での設定上書きを実装可能
  return NOTIFICATION_TIMING_CONFIG;
}