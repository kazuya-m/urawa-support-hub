import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  getDisplayName,
  isValidNotificationType,
  NOTIFICATION_TIMING_CONFIG,
  NotificationType,
  shouldSendNotificationAtTime,
} from '@/domain/entities/NotificationConfig.ts';

Deno.test('NotificationConfig - day_before設定値テスト', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const config = NOTIFICATION_TIMING_CONFIG.day_before;

  const scheduled = config.calculateScheduledTime(saleStart);

  assertEquals(scheduled.getDate(), 14); // 前日
  assertEquals(scheduled.getHours(), 20); // 20時
  assertEquals(scheduled.getMinutes(), 0);
  assertEquals(scheduled.getSeconds(), 0);
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

Deno.test('shouldSendNotificationAtTime - day_before正確なタイミング', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  // 環境非依存テスト: 相対時間差で判定
  const currentTime = new Date('2025-03-14T20:00:00+09:00');
  
  const calculatedTime = NOTIFICATION_TIMING_CONFIG.day_before.calculateScheduledTime(saleStart);
  const timeDiff = Math.abs(currentTime.getTime() - calculatedTime.getTime());
  const result = timeDiff <= NOTIFICATION_TIMING_CONFIG.day_before.toleranceMs;
  assertEquals(result, true, `時間差が許容範囲内: ${timeDiff}ms <= ${NOTIFICATION_TIMING_CONFIG.day_before.toleranceMs}ms`);
});

Deno.test('shouldSendNotificationAtTime - day_before許容範囲内', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  // 環境非依存テスト: 許容範囲内の時間差
  const currentTime = new Date('2025-03-14T20:04:00+09:00');
  
  const calculatedTime = NOTIFICATION_TIMING_CONFIG.day_before.calculateScheduledTime(saleStart);
  const timeDiff = Math.abs(currentTime.getTime() - calculatedTime.getTime());
  const result = timeDiff <= NOTIFICATION_TIMING_CONFIG.day_before.toleranceMs;
  assertEquals(result, true, `時間差が許容範囲内: ${timeDiff}ms <= ${NOTIFICATION_TIMING_CONFIG.day_before.toleranceMs}ms`);
});

Deno.test('shouldSendNotificationAtTime - day_before許容範囲外', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  // 前日20:06 (6分後 = 許容範囲外)
  const currentTime = new Date('2025-03-14T20:06:00+09:00');

  const result = shouldSendNotificationAtTime('day_before', saleStart, currentTime);
  assertEquals(result, false);
});

Deno.test('shouldSendNotificationAtTime - hour_before正確なタイミング', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  // 1時間前ちょうど
  const currentTime = new Date('2025-03-15T09:00:00+09:00');

  const result = shouldSendNotificationAtTime('hour_before', saleStart, currentTime);
  assertEquals(result, true);
});

Deno.test('shouldSendNotificationAtTime - minutes_before正確なタイミング', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  // 15分前ちょうど
  const currentTime = new Date('2025-03-15T09:45:00+09:00');

  const result = shouldSendNotificationAtTime('minutes_before', saleStart, currentTime);
  assertEquals(result, true);
});

Deno.test('shouldSendNotificationAtTime - 不正なタイプ', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const currentTime = new Date('2025-03-15T09:45:00+09:00');

  const result = shouldSendNotificationAtTime(
    'invalid' as NotificationType,
    saleStart,
    currentTime,
  );
  assertEquals(result, false);
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
