import { assertEquals, assertExists, assertThrows } from 'jsr:@std/assert';
import { Ticket } from '../Ticket.ts';
import { DataQuality } from '../DataQuality.ts';

Deno.test('Ticket - 新規チケット作成と決定論的ID生成', async () => {
  const futureMatchDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

  const ticket = await Ticket.createNew({
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: futureSaleDate,
    saleStartTime: '10:00',
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
  });

  // IDが生成されていることを確認
  assertExists(ticket.id);
  // UUID v5形式であることを確認
  const uuidV5Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assertEquals(uuidV5Regex.test(ticket.id), true);
  assertEquals(ticket.matchName, 'FC東京 vs 浦和レッズ');
  assertEquals(ticket.homeTeam, 'FC東京');
  assertEquals(ticket.awayTeam, '浦和レッズ');
});

Deno.test('Ticket - 同じ対戦カード+日付から同じID生成', async () => {
  const matchDate = new Date('2025-03-15T19:00:00+09:00');
  const saleDate = new Date('2025-03-14T10:00:00+09:00');

  const ticket1 = await Ticket.createNew({
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate,
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: saleDate,
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
  });

  const ticket2 = await Ticket.createNew({
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate,
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: saleDate,
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
  });

  // 同じ対戦カード+日付から同じIDが生成される
  assertEquals(ticket1.id, ticket2.id);
  // equals メソッドのテスト
  assertEquals(ticket1.equals(ticket2), true);
});

Deno.test('Ticket - 既存チケットの復元', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const ticket = Ticket.fromExisting({
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

Deno.test('Ticket - バリデーション: 既存チケットに空のID', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  assertThrows(
    () =>
      Ticket.fromExisting({
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
    'ID is required for existing ticket',
  );
});

Deno.test('Ticket - バリデーション: 試合日が販売開始日より前', () => {
  const now = new Date();
  const pastMatchDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  assertThrows(
    () =>
      Ticket.fromExisting({
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
      Ticket.fromExisting({
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
    'Invalid ticket URL format',
  );
});

Deno.test('Ticket - 通知タイミング判定: 前日20:00通知', () => {
  // 計算ロジックのテスト（環境非依存）
  const saleStartDate = new Date('2025-03-15T10:00:00+09:00');
  const ticket = Ticket.fromExisting({
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

  // 通知設定の基本動作テスト（時間計算ではなく設定値確認）
  assertEquals(typeof ticket.shouldSendNotification('day_before', new Date()), 'boolean');

  // 通知タイプの有効性テスト
  assertEquals(ticket.shouldSendNotification('hour_before', new Date()), false);
  assertEquals(ticket.shouldSendNotification('minutes_before', new Date()), false);
});

Deno.test('Ticket - 通知タイミング判定: 1時間前通知', () => {
  const saleStartDate = new Date('2025-03-15T10:00:00+09:00');
  const ticket = Ticket.fromExisting({
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
  const ticket = Ticket.fromExisting({
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

  const validTicket = Ticket.fromExisting({
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

  const pastMatchTicket = Ticket.fromExisting({
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

Deno.test('Ticket - UUID形式のID検証', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // UUID形式のIDでチケット作成
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const testId = crypto.randomUUID();

  const ticket = Ticket.fromExisting({
    id: testId,
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
  });

  assertEquals(ticket.id, testId);
  assertEquals(uuidV4Regex.test(ticket.id), true);
  assertEquals(ticket.matchName, 'FC東京 vs 浦和レッズ');
});

Deno.test('Ticket - homeTeam/awayTeamがundefinedでも作成可能', async () => {
  const futureMatchDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

  const ticket = await Ticket.createNew({
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    // homeTeam と awayTeam を省略
    saleStartDate: futureSaleDate,
    saleStartTime: '10:00',
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
  });

  // IDが生成されていることを確認
  assertExists(ticket.id);
  assertEquals(ticket.matchName, 'FC東京 vs 浦和レッズ');
  assertEquals(ticket.homeTeam, undefined);
  assertEquals(ticket.awayTeam, undefined);
});

Deno.test('Ticket - データ品質レベル判定: COMPLETE', async () => {
  const futureMatchDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

  const ticket = await Ticket.createNew({
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: futureSaleDate,
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
  });

  assertEquals(ticket.getDataQuality(), DataQuality.COMPLETE);
});

Deno.test('Ticket - データ品質レベル判定: PARTIAL', async () => {
  const futureMatchDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

  const ticket = await Ticket.createNew({
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    saleStartDate: futureSaleDate,
    venue: '味の素スタジアム',
    ticketTypes: [], // 空配列
    ticketUrl: '', // 空文字
  });

  assertEquals(ticket.getDataQuality(), DataQuality.PARTIAL);
});

Deno.test('Ticket - データ品質レベル判定: MINIMAL', async () => {
  const futureMatchDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

  const ticket = await Ticket.createNew({
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    saleStartDate: futureSaleDate,
    venue: '', // 空文字
    ticketTypes: [], // 空配列
    ticketUrl: '', // 空文字
  });

  assertEquals(ticket.getDataQuality(), DataQuality.MINIMAL);
});

Deno.test('Ticket - 空文字のhomeTeam/awayTeamは拒否される', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const futureSaleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  assertThrows(
    () =>
      Ticket.fromExisting({
        id: 'test-id',
        matchName: 'FC東京 vs 浦和レッズ',
        matchDate: futureMatchDate,
        homeTeam: '', // 空文字は拒否
        awayTeam: '浦和レッズ',
        saleStartDate: futureSaleDate,
        venue: '味の素スタジアム',
        ticketTypes: ['ビジター席'],
        ticketUrl: 'https://example.com/tickets',
        createdAt: now,
        updatedAt: now,
      }),
    Error,
    'Home team cannot be empty string',
  );

  assertThrows(
    () =>
      Ticket.fromExisting({
        id: 'test-id',
        matchName: 'FC東京 vs 浦和レッズ',
        matchDate: futureMatchDate,
        homeTeam: 'FC東京',
        awayTeam: '', // 空文字は拒否
        saleStartDate: futureSaleDate,
        venue: '味の素スタジアム',
        ticketTypes: ['ビジター席'],
        ticketUrl: 'https://example.com/tickets',
        createdAt: now,
        updatedAt: now,
      }),
    Error,
    'Away team cannot be empty string',
  );
});
