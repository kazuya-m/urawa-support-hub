import { assertEquals, assertThrows } from 'std/assert/mod.ts';
import { Ticket } from '../Ticket.ts';

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
  // モック時刻でのテスト（環境非依存）
  const mockSaleStart = new Date('2025-03-15T01:00:00Z'); // UTC（JST 10:00相当）
  const mockTicket = new Ticket({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: new Date('2025-03-16T19:00:00+09:00'),
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: mockSaleStart,
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 前日UTC 11:00（JST 20:00相当）- 正確なタイミング
  const mockCurrentTime = new Date('2025-03-14T11:00:00Z');
  assertEquals(mockTicket.shouldSendNotification('day_before', mockCurrentTime), true);

  // 前日UTC 11:03（JST 20:03相当）- 許容範囲内
  const mockCurrentTime2 = new Date('2025-03-14T11:03:00Z');
  assertEquals(mockTicket.shouldSendNotification('day_before', mockCurrentTime2), true);

  // 前日UTC 11:10（JST 20:10相当）- 許容範囲外
  const mockCurrentTime3 = new Date('2025-03-14T11:10:00Z');
  assertEquals(mockTicket.shouldSendNotification('day_before', mockCurrentTime3), false);
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
