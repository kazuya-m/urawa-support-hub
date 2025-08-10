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

Deno.test('shouldSendNotificationAtTime - day_before計算ロジック', () => {
  // 計算ロジックのテスト（時間差テスト）
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const config = NOTIFICATION_TIMING_CONFIG.day_before;

  // 計算された時刻が前日であることを確認
  const calculatedTime = config.calculateScheduledTime(saleStart);
  const expectedDay = new Date(saleStart);
  expectedDay.setDate(expectedDay.getDate() - 1);

  assertEquals(calculatedTime.getDate(), expectedDay.getDate());
  assertEquals(calculatedTime.getMonth(), expectedDay.getMonth());
});

Deno.test('shouldSendNotificationAtTime - day_before設定確認', () => {
  // 設定値の正当性テスト
  const config = NOTIFICATION_TIMING_CONFIG.day_before;

  assertEquals(config.displayName, '販売開始前日');
  assertEquals(config.toleranceMs, 5 * 60 * 1000); // 5分
  assertEquals(typeof config.calculateScheduledTime, 'function');
  assertEquals(config.description.includes('前日20:00'), true);
});

Deno.test('shouldSendNotificationAtTime - day_before許容範囲確認', () => {
  // 許容範囲の設定値テスト
  const config = NOTIFICATION_TIMING_CONFIG.day_before;
  const toleranceMinutes = config.toleranceMs / (60 * 1000);

  assertEquals(toleranceMinutes, 5); // 5分の許容範囲
  assertEquals(config.toleranceMs > 0, true); // 正の値であること
});

Deno.test('shouldSendNotificationAtTime - hour_before計算ロジック', () => {
  // 1時間前計算の確認
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const config = NOTIFICATION_TIMING_CONFIG.hour_before;

  const calculatedTime = config.calculateScheduledTime(saleStart);
  const expectedTime = new Date(saleStart.getTime() - 60 * 60 * 1000); // 1時間前

  assertEquals(calculatedTime.getTime(), expectedTime.getTime());
  assertEquals(config.displayName, '販売開始1時間前');
});

Deno.test('shouldSendNotificationAtTime - minutes_before計算ロジック', () => {
  // 15分前計算の確認
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const config = NOTIFICATION_TIMING_CONFIG.minutes_before;

  const calculatedTime = config.calculateScheduledTime(saleStart);
  const expectedTime = new Date(saleStart.getTime() - 15 * 60 * 1000); // 15分前

  assertEquals(calculatedTime.getTime(), expectedTime.getTime());
  assertEquals(config.displayName, '販売開始15分前');
  assertEquals(config.toleranceMs, 2 * 60 * 1000); // 2分許容範囲
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
