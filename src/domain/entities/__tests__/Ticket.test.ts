import { assertEquals, assertThrows } from 'std/assert/mod.ts';
import { Ticket } from '../Ticket.ts';
import { NOTIFICATION_TIMING_CONFIG } from '../NotificationConfig.ts';

Deno.test('Ticket - 正常なチケット作成', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const ticket = new Ticket({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: futureSaleDate,
    saleStartTime: '10:00',
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
    createdAt: now,
    updatedAt: now,
  });

  assertEquals(ticket.id, 'test-id');
  assertEquals(ticket.matchName, 'FC東京 vs 浦和レッズ');
  assertEquals(ticket.homeTeam, 'FC東京');
  assertEquals(ticket.awayTeam, '浦和レッズ');
});

Deno.test('Ticket - バリデーション: 空のID', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  assertThrows(
    () =>
      new Ticket({
        id: '',
        matchName: 'FC東京 vs 浦和レッズ',
        matchDate: futureMatchDate,
        homeTeam: 'FC東京',
        awayTeam: '浦和レッズ',
        saleStartDate: futureSaleDate,
        venue: '味の素スタジアム',
        ticketTypes: ['ビジター席'],
        ticketUrl: 'https://example.com/tickets',
        createdAt: now,
        updatedAt: now,
      }),
    Error,
    'Ticket ID is required',
  );
});

Deno.test('Ticket - バリデーション: 試合日が販売開始日より前', () => {
  const now = new Date();
  const pastMatchDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  assertThrows(
    () =>
      new Ticket({
        id: 'test-id',
        matchName: 'FC東京 vs 浦和レッズ',
        matchDate: pastMatchDate,
        homeTeam: 'FC東京',
        awayTeam: '浦和レッズ',
        saleStartDate: futureSaleDate,
        venue: '味の素スタジアム',
        ticketTypes: ['ビジター席'],
        ticketUrl: 'https://example.com/tickets',
        createdAt: now,
        updatedAt: now,
      }),
    Error,
    'Match date must be after sale start date',
  );
});

Deno.test('Ticket - バリデーション: 不正なURL', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  assertThrows(
    () =>
      new Ticket({
        id: 'test-id',
        matchName: 'FC東京 vs 浦和レッズ',
        matchDate: futureMatchDate,
        homeTeam: 'FC東京',
        awayTeam: '浦和レッズ',
        saleStartDate: futureSaleDate,
        venue: '味の素スタジアム',
        ticketTypes: ['ビジター席'],
        ticketUrl: 'invalid-url',
        createdAt: now,
        updatedAt: now,
      }),
    Error,
    'Valid ticket URL is required',
  );
});

Deno.test('Ticket - 通知タイミング判定: 前日20:00通知', () => {
  const saleStartDate = new Date('2025-03-15T10:00:00+09:00');
  const ticket = new Ticket({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: new Date('2025-03-16T19:00:00+09:00'),
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate,
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 環境非依存テスト: NotificationConfig関数を直接使用
  const dayBeforeAt8PM = new Date('2025-03-14T20:00:00+09:00');
  const calculatedTime = NOTIFICATION_TIMING_CONFIG.day_before.calculateScheduledTime(
    saleStartDate,
  );
  const timeDiff = Math.abs(dayBeforeAt8PM.getTime() - calculatedTime.getTime());
  assertEquals(
    timeDiff <= NOTIFICATION_TIMING_CONFIG.day_before.toleranceMs,
    true,
    `時間差が許容範囲内: ${timeDiff}ms <= ${NOTIFICATION_TIMING_CONFIG.day_before.toleranceMs}ms`,
  );

  const dayBeforeAt803PM = new Date('2025-03-14T20:03:00+09:00');
  assertEquals(ticket.shouldSendNotification('day_before', dayBeforeAt803PM), true);

  const dayBeforeAt810PM = new Date('2025-03-14T20:10:00+09:00');
  assertEquals(ticket.shouldSendNotification('day_before', dayBeforeAt810PM), false);
});

Deno.test('Ticket - 通知タイミング判定: 1時間前通知', () => {
  const saleStartDate = new Date('2025-03-15T10:00:00+09:00');
  const ticket = new Ticket({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: new Date('2025-03-16T19:00:00+09:00'),
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate,
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const hourBefore = new Date('2025-03-15T09:00:00+09:00');
  assertEquals(ticket.shouldSendNotification('hour_before', hourBefore), true);

  const hourBeforePlus3 = new Date('2025-03-15T09:03:00+09:00');
  assertEquals(ticket.shouldSendNotification('hour_before', hourBeforePlus3), true);

  const hourBeforePlus10 = new Date('2025-03-15T09:10:00+09:00');
  assertEquals(ticket.shouldSendNotification('hour_before', hourBeforePlus10), false);
});

Deno.test('Ticket - 販売状態判定', () => {
  const now = new Date();
  const saleStartDate = new Date(now.getTime() - 60 * 60 * 1000);
  const ticket = new Ticket({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate,
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
    createdAt: now,
    updatedAt: now,
  });

  assertEquals(ticket.isOnSale(now), true);
  assertEquals(ticket.isOnSale(new Date(saleStartDate.getTime() - 1000)), false);
});

Deno.test('Ticket - 通知対象判定', () => {
  const now = new Date();

  const validTicket = new Ticket({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
    createdAt: now,
    updatedAt: now,
  });

  assertEquals(validTicket.isValidForNotification(), true);

  const pastMatchTicket = new Ticket({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
    createdAt: now,
    updatedAt: now,
  });

  assertEquals(pastMatchTicket.isValidForNotification(), false);
});
