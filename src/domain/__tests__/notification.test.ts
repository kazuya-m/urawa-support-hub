import { assertEquals } from 'std/assert/mod.ts';
import { calculateNotificationTime, isWithinSendWindow } from '../notification.ts';
import { NOTIFICATION_TYPES } from '@/domain/config/NotificationConfig.ts';

const saleStartDate = new Date('2025-03-02T10:00:00+09:00');
const minutes = (n: number) => n * 60 * 1000;
const shift = (date: Date, ms: number) => new Date(date.getTime() + ms);

Deno.test('calculateNotificationTime', async (t) => {
  await t.step('前日通知は販売開始日の前日 20:00 JST', () => {
    assertEquals(
      calculateNotificationTime(NOTIFICATION_TYPES.DAY_BEFORE, saleStartDate),
      new Date('2025-03-01T20:00:00+09:00'),
    );
  });

  await t.step('1 時間前・15 分前', () => {
    assertEquals(
      calculateNotificationTime(NOTIFICATION_TYPES.HOUR_BEFORE, saleStartDate),
      new Date('2025-03-02T09:00:00+09:00'),
    );
    assertEquals(
      calculateNotificationTime(NOTIFICATION_TYPES.MINUTES_BEFORE, saleStartDate),
      new Date('2025-03-02T09:45:00+09:00'),
    );
  });
});

Deno.test('isWithinSendWindow', async (t) => {
  const hourBefore = new Date('2025-03-02T09:00:00+09:00');

  await t.step('送信時刻ちょうどは送る', () => {
    assertEquals(
      isWithinSendWindow(NOTIFICATION_TYPES.HOUR_BEFORE, saleStartDate, hourBefore),
      true,
    );
  });

  await t.step('許容範囲の下限ちょうどは送り、その直前は送らない', () => {
    const earliest = shift(hourBefore, -minutes(5));
    assertEquals(
      isWithinSendWindow(NOTIFICATION_TYPES.HOUR_BEFORE, saleStartDate, earliest),
      true,
    );
    assertEquals(
      isWithinSendWindow(NOTIFICATION_TYPES.HOUR_BEFORE, saleStartDate, shift(earliest, -1)),
      false,
    );
  });

  await t.step('販売開始の直前までは送り、販売開始ちょうど以降は送らない', () => {
    assertEquals(
      isWithinSendWindow(NOTIFICATION_TYPES.HOUR_BEFORE, saleStartDate, shift(saleStartDate, -1)),
      true,
    );
    assertEquals(
      isWithinSendWindow(NOTIFICATION_TYPES.HOUR_BEFORE, saleStartDate, saleStartDate),
      false,
    );
  });

  await t.step('前日通知は翌朝でも販売開始前なら送る', () => {
    assertEquals(
      isWithinSendWindow(
        NOTIFICATION_TYPES.DAY_BEFORE,
        saleStartDate,
        new Date('2025-03-02T08:00:00+09:00'),
      ),
      true,
    );
  });

  await t.step('販売日が延期された後の旧タスク（旧時刻での発火）は送らない', () => {
    const postponed = new Date('2025-03-09T10:00:00+09:00');
    assertEquals(isWithinSendWindow(NOTIFICATION_TYPES.HOUR_BEFORE, postponed, hourBefore), false);
  });
});
