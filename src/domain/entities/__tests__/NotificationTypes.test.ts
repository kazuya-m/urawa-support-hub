import { assertEquals } from 'std/assert/mod.ts';
import {
  getDisplayName,
  isValidNotificationType,
  NOTIFICATION_TIMING_CONFIG,
  NotificationType,
} from '@/domain/config/NotificationConfig.ts';
import { toJSTDate } from '@/shared/utils/datetime.ts';

Deno.test('NotificationConfig - day_before設定値テスト', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const config = NOTIFICATION_TIMING_CONFIG.day_before;

  const scheduled = config.calculateScheduledTime(saleStart);

  // JST時刻で検証（UTCからJST時刻に変換）
  const scheduledJST = toJSTDate(scheduled);

  assertEquals(scheduledJST.getDate(), 14); // 前日
  assertEquals(scheduledJST.getHours(), 20); // 20時
  assertEquals(scheduledJST.getMinutes(), 0);
  assertEquals(scheduledJST.getSeconds(), 0);
  assertEquals(config.toleranceMs, 5 * 60 * 1000); // 5分
  assertEquals(config.displayName, '販売開始前日');
});

Deno.test('NotificationConfig - hour_before設定値テスト', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const config = NOTIFICATION_TIMING_CONFIG.hour_before;

  const scheduled = config.calculateScheduledTime(saleStart);
  const expectedTime = new Date(saleStart.getTime() - 60 * 60 * 1000);

  assertEquals(scheduled.getTime(), expectedTime.getTime());
  assertEquals(config.toleranceMs, 5 * 60 * 1000); // 5分
  assertEquals(config.displayName, '販売開始1時間前');
});

Deno.test('NotificationConfig - minutes_before設定値テスト', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const config = NOTIFICATION_TIMING_CONFIG.minutes_before;

  const scheduled = config.calculateScheduledTime(saleStart);
  const expectedTime = new Date(saleStart.getTime() - 15 * 60 * 1000);

  assertEquals(scheduled.getTime(), expectedTime.getTime());
  assertEquals(config.toleranceMs, 2 * 60 * 1000); // 2分
  assertEquals(config.displayName, '販売開始15分前');
});

Deno.test('getDisplayName - 正常なタイプ', () => {
  assertEquals(getDisplayName('day_before'), '販売開始前日');
  assertEquals(getDisplayName('hour_before'), '販売開始1時間前');
  assertEquals(getDisplayName('minutes_before'), '販売開始15分前');
});

Deno.test('getDisplayName - 不正なタイプ', () => {
  const result = getDisplayName('invalid' as NotificationType);
  assertEquals(result, 'invalid'); // フォールバック
});

Deno.test('isValidNotificationType - 正常なタイプ', () => {
  assertEquals(isValidNotificationType('day_before'), true);
  assertEquals(isValidNotificationType('hour_before'), true);
  assertEquals(isValidNotificationType('minutes_before'), true);
});

Deno.test('isValidNotificationType - 不正なタイプ', () => {
  assertEquals(isValidNotificationType('invalid'), false);
  assertEquals(isValidNotificationType(''), false);
  assertEquals(isValidNotificationType('day_after'), false);
});

Deno.test('isValidNotificationType - Object.prototype のプロパティ名と文字列以外', () => {
  assertEquals(isValidNotificationType('toString'), false);
  assertEquals(isValidNotificationType('constructor'), false);
  assertEquals(isValidNotificationType('__proto__'), false);
  assertEquals(isValidNotificationType(1), false);
  assertEquals(isValidNotificationType(null), false);
});
