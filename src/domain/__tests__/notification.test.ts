import { assertEquals } from 'std/assert/mod.ts';
import {
  calculateNotificationTime,
  isWithinSendWindow,
  listUpcomingNotifications,
  SCHEDULING_HORIZON_MS,
  type UpcomingNotification,
} from '../notification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
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

function ticketWith(overrides: Partial<Parameters<typeof Ticket.fromExisting>[0]> = {}): Ticket {
  return Ticket.fromExisting({
    id: 't-1',
    matchName: 'テスト試合',
    matchDate: new Date('2025-03-20T19:00:00+09:00'),
    homeTeam: null,
    awayTeam: null,
    competition: null,
    venue: null,
    ticketTypes: [],
    ticketUrl: null,
    saleStartDate,
    saleEndDate: null,
    saleStatus: 'before_sale',
    createdAt: null,
    updatedAt: null,
    scrapedAt: new Date('2025-02-01T00:00:00Z'),
    ...overrides,
  });
}

const times = (notifications: UpcomingNotification[]) =>
  notifications.map((n) => [n.notificationType, n.notificationTime.toISOString()]);

Deno.test('listUpcomingNotifications', async (t) => {
  const collectedAt = new Date('2025-02-28T05:00:00+09:00');

  await t.step('48 時間以内の通知だけを返す', () => {
    assertEquals(times(listUpcomingNotifications([ticketWith()], collectedAt)), [
      ['day_before', '2025-03-01T11:00:00.000Z'],
    ]);
    assertEquals(
      times(listUpcomingNotifications([ticketWith()], new Date('2025-03-01T05:00:00+09:00'))),
      [
        ['day_before', '2025-03-01T11:00:00.000Z'],
        ['hour_before', '2025-03-02T00:00:00.000Z'],
        ['minutes_before', '2025-03-02T00:45:00.000Z'],
      ],
    );
  });

  await t.step('ちょうど 48 時間後は含み、1 ms でも超えたら含まない', () => {
    const minutesBefore = new Date('2025-03-02T09:45:00+09:00');
    const exactly = shift(minutesBefore, -SCHEDULING_HORIZON_MS);
    assertEquals(
      listUpcomingNotifications([ticketWith()], exactly).map((n) => n.notificationType),
      ['day_before', 'hour_before', 'minutes_before'],
    );
    assertEquals(
      listUpcomingNotifications([ticketWith()], shift(exactly, -1)).map((n) => n.notificationType),
      ['day_before', 'hour_before'],
    );
  });

  await t.step('送信時刻ちょうど・過去の通知は返さない', () => {
    const atDayBefore = new Date('2025-03-01T20:00:00+09:00');
    assertEquals(
      listUpcomingNotifications([ticketWith()], atDayBefore).map((n) => n.notificationType),
      ['hour_before', 'minutes_before'],
    );
  });

  await t.step('30 日以上先のチケットは、範囲に入った日に 3 タイプとも返る', () => {
    const farTicket = ticketWith({
      saleStartDate: new Date('2025-04-15T10:00:00+09:00'),
      matchDate: new Date('2025-04-30T19:00:00+09:00'),
    });
    assertEquals(listUpcomingNotifications([farTicket], collectedAt), []);
    assertEquals(
      listUpcomingNotifications([farTicket], new Date('2025-04-14T05:00:00+09:00'))
        .map((n) => n.notificationType),
      ['day_before', 'hour_before', 'minutes_before'],
    );
  });

  await t.step('販売日が変わったら新しい販売日から計算する', () => {
    const nextDay = new Date('2025-03-01T05:00:00+09:00');
    const postponed = ticketWith({ saleStartDate: new Date('2025-03-03T10:00:00+09:00') });
    assertEquals(times(listUpcomingNotifications([postponed], nextDay)), [
      ['day_before', '2025-03-02T11:00:00.000Z'],
    ]);
    const advanced = ticketWith({ saleStartDate: new Date('2025-03-01T10:00:00+09:00') });
    assertEquals(times(listUpcomingNotifications([advanced], collectedAt)), [
      ['day_before', '2025-02-28T11:00:00.000Z'],
      ['hour_before', '2025-03-01T00:00:00.000Z'],
      ['minutes_before', '2025-03-01T00:45:00.000Z'],
    ]);
  });

  await t.step('販売開始日なし・販売前以外・試合日が過去のチケットは返さない', () => {
    const excluded = [
      ticketWith({ id: 'no-sale-date', saleStartDate: null }),
      ticketWith({ id: 'on-sale', saleStatus: 'on_sale' }),
      ticketWith({ id: 'sold-out', saleStatus: 'sold_out' }),
      ticketWith({ id: 'unknown', saleStatus: null }),
      ticketWith({ id: 'past-match', matchDate: new Date('2025-02-27T19:00:00+09:00') }),
    ];
    assertEquals(listUpcomingNotifications(excluded, collectedAt), []);
  });

  await t.step('チケット ID と通知タイプを返す', () => {
    assertEquals(
      listUpcomingNotifications([ticketWith({ id: 'abc' })], collectedAt)[0],
      {
        ticketId: 'abc',
        notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
        notificationTime: new Date('2025-03-01T20:00:00+09:00'),
      },
    );
  });
});
