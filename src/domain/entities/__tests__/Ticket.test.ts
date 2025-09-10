import { assert, assertEquals, assertExists } from 'std/assert/mod.ts';
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  });

  assertEquals(ticket.id, 'test-id');
  assertEquals(ticket.matchName, 'FC東京 vs 浦和レッズ');
  assertEquals(ticket.homeTeam, 'FC東京');
  assertEquals(ticket.awayTeam, '浦和レッズ');
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
    scrapedAt: new Date(),
    saleStatus: 'on_sale', // 販売中状態
  });

  assertEquals(ticket.saleStatus, 'on_sale');
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  });

  assertEquals(pastMatchTicket.isValidForNotification(), false);
});

// 通知タイミング関連のテストはNotificationSchedulerServiceに移動

Deno.test('Ticket - shouldScheduleNotification判定', () => {
  const now = new Date();
  const saleStartDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1日後
  const matchDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2日後（販売開始より後）

  // 通知すべきチケット
  const shouldNotifyTicket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate,
    saleStartDate,
    venue: '味の素スタジアム',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  assertEquals(shouldNotifyTicket.shouldScheduleNotification(), true);

  // 既に通知済みのチケット
  const alreadyNotifiedTicket = Ticket.fromExisting({
    id: 'test-id-2',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate,
    saleStartDate,
    venue: '味の素スタジアム',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: true, // 既に通知済み
  });

  assertEquals(alreadyNotifiedTicket.shouldScheduleNotification(), false);

  // 販売中のチケット
  const onSaleTicket = Ticket.fromExisting({
    id: 'test-id-3',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate,
    saleStartDate,
    venue: '味の素スタジアム',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'on_sale', // 販売中
    notificationScheduled: false,
  });

  assertEquals(onSaleTicket.shouldScheduleNotification(), false);
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
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
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
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
    venue: '味の素スタジアム', // venueのみ存在
    // ticketTypes, ticketUrl は省略
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
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
    // venue, ticketTypes, ticketUrl を省略（undefined）
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  assertEquals(ticket.getDataQuality(), DataQuality.MINIMAL);
});

// 新規の販売状態管理テスト
Deno.test('Ticket - 販売状態管理メソッド: before_sale', async () => {
  const ticket = await Ticket.createNew({
    matchName: 'テストマッチ vs チーム2',
    matchDate: new Date('2024-09-15T14:00:00Z'),
    saleStartDate: new Date('2024-08-15T10:00:00Z'),
    venue: 'テストスタジアム',
    ticketTypes: ['S席', 'A席'],
    ticketUrl: 'https://example.com/tickets',
    scrapedAt: new Date('2024-08-10T12:00:00Z'),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  assertEquals(ticket.saleStatus, 'before_sale', 'Should be before sale');
  assertEquals(ticket.requiresNotification(), true, 'Should require notification');
});

Deno.test('Ticket - 販売状態管理メソッド: on_sale', async () => {
  const ticket = await Ticket.createNew({
    matchName: 'テストマッチ vs チーム2',
    matchDate: new Date('2024-09-15T14:00:00Z'),
    saleStartDate: new Date('2024-08-15T10:00:00Z'),
    saleEndDate: new Date('2024-09-12T23:59:00Z'),
    venue: 'テストスタジアム',
    ticketTypes: ['S席', 'A席'],
    ticketUrl: 'https://example.com/tickets',
    scrapedAt: new Date('2024-08-20T12:00:00Z'),
    saleStatus: 'on_sale',
    notificationScheduled: false,
  });

  assertEquals(ticket.saleStatus, 'on_sale', 'Should be on sale');
  assertEquals(
    ticket.requiresNotification(),
    false,
    'Should not require notification when on sale',
  );
});

Deno.test('Ticket - 販売状態管理メソッド: ended', async () => {
  const ticket = await Ticket.createNew({
    matchName: 'テストマッチ vs チーム2',
    matchDate: new Date('2024-09-15T14:00:00Z'),
    saleStartDate: new Date('2024-08-15T10:00:00Z'),
    saleEndDate: new Date('2024-09-12T23:59:00Z'),
    venue: 'テストスタジアム',
    ticketTypes: ['S席', 'A席'],
    ticketUrl: 'https://example.com/tickets',
    scrapedAt: new Date('2024-09-13T12:00:00Z'),
    saleStatus: 'ended',
    notificationScheduled: false,
  });

  assertEquals(ticket.saleStatus, 'ended', 'Should be ended');
  assertEquals(ticket.requiresNotification(), false, 'Should not require notification when ended');
});

Deno.test('Ticket - 通知済みの場合の制御', async () => {
  const ticket = await Ticket.createNew({
    matchName: 'テストマッチ vs チーム2',
    matchDate: new Date('2024-09-15T14:00:00Z'),
    saleStartDate: new Date('2024-08-15T10:00:00Z'),
    venue: 'テストスタジアム',
    ticketTypes: ['S席', 'A席'],
    ticketUrl: 'https://example.com/tickets',
    scrapedAt: new Date('2024-08-10T12:00:00Z'),
    saleStatus: 'before_sale',
    notificationScheduled: true,
  });

  assertEquals(ticket.saleStatus, 'before_sale', 'Should be before sale');
  assertEquals(
    ticket.requiresNotification(),
    false,
    'Should not require notification when already scheduled',
  );
});

Deno.test('Ticket - 新しいプロパティのgetter', async () => {
  const scrapedAt = new Date('2024-08-10T12:00:00Z');
  const saleEndDate = new Date('2024-09-12T23:59:00Z');

  const ticket = await Ticket.createNew({
    matchName: 'テストマッチ vs チーム2',
    matchDate: new Date('2024-09-15T14:00:00Z'),
    saleStartDate: new Date('2024-08-15T10:00:00Z'),
    saleEndDate,
    venue: 'テストスタジアム',
    ticketTypes: ['S席', 'A席'],
    ticketUrl: 'https://example.com/tickets',
    scrapedAt,
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  assertEquals(ticket.scrapedAt, scrapedAt, 'Should return correct scraped at time');
  assertEquals(ticket.saleEndDate, saleEndDate, 'Should return correct sale end date');
  assertEquals(ticket.saleStatus, 'before_sale', 'Should return correct sale status');
  assertEquals(
    ticket.notificationScheduled,
    false,
    'Should return correct notification scheduled status',
  );
});

// 販売日時がnullの場合のテスト
Deno.test('Ticket - 販売日時がnullの場合の通知制御', async () => {
  const ticket = await Ticket.createNew({
    matchName: 'テストマッチ vs チーム2',
    matchDate: new Date('2024-09-15T14:00:00Z'),
    saleStartDate: null, // 販売日時が取得できなかった場合
    venue: 'テストスタジアム',
    ticketTypes: ['S席', 'A席'],
    ticketUrl: 'https://example.com/tickets',
    scrapedAt: new Date('2024-08-10T12:00:00Z'),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  assertEquals(ticket.saleStartDate, null, 'Should have null sale start date');
  assertEquals(
    ticket.requiresNotification(),
    false,
    'Should not require notification when sale start date is null',
  );
  assertEquals(
    ticket.shouldSendNotification('day_before'),
    false,
    'Should not send notification when sale start date is null',
  );
  assertEquals(
    ticket.isValidForNotification(),
    false,
    'Should not be valid for notification when sale start date is null',
  );
});

Deno.test('Ticket - 販売日時がnullでもチケット作成可能', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const ticket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    homeTeam: 'FC東京',
    awayTeam: '浦和レッズ',
    saleStartDate: null, // NULL許容
    venue: '味の素スタジアム',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/tickets',
    createdAt: now,
    updatedAt: now,
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  });

  assertEquals(ticket.id, 'test-id');
  assertEquals(ticket.saleStartDate, null);
  assertEquals(ticket.matchName, 'FC東京 vs 浦和レッズ');
});

Deno.test('Ticket - optionalフィールドが省略可能', async () => {
  const futureMatchDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);

  const ticket = await Ticket.createNew({
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    saleStartDate: null,
    // venue, ticketTypes, ticketUrl を省略
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  assertEquals(ticket.venue, undefined);
  assertEquals(ticket.ticketTypes, []); // 空配列が返される
  assertEquals(ticket.ticketUrl, undefined);
  assertEquals(ticket.getDataQuality(), DataQuality.MINIMAL);
});

Deno.test('Ticket - optionalフィールドでundefinedとnullの区別', () => {
  const now = new Date();
  const futureMatchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const ticket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'FC東京 vs 浦和レッズ',
    matchDate: futureMatchDate,
    saleStartDate: null,
    venue: undefined, // undefinedを明示的に設定
    ticketTypes: undefined,
    ticketUrl: undefined,
    createdAt: now,
    updatedAt: now,
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  });

  assertEquals(ticket.venue, undefined);
  assertEquals(ticket.ticketTypes, []); // undefinedでも空配列が返される
  assertEquals(ticket.ticketUrl, undefined);
});

Deno.test('Ticket - markNotificationScheduled creates new instance with updated state', async () => {
  const originalTicket = await Ticket.createNew({
    matchName: 'テストマッチ',
    matchDate: new Date('2025-12-31T19:00:00+09:00'),
    saleStartDate: new Date('2025-12-01T10:00:00+09:00'),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  });

  assertEquals(originalTicket.notificationScheduled, false);

  // 少し待機してからmarkNotificationScheduledを実行
  await new Promise((resolve) => setTimeout(resolve, 10));

  const updatedTicket = originalTicket.markNotificationScheduled();

  // 新しいインスタンスが作成される（不変性）
  assert(originalTicket !== updatedTicket);

  // 元のインスタンスは変更されない
  assertEquals(originalTicket.notificationScheduled, false);

  // 新しいインスタンスは通知スケジュール済み
  assertEquals(updatedTicket.notificationScheduled, true);

  // updatedAtが更新される
  assert(updatedTicket.updatedAt >= originalTicket.updatedAt);

  // その他のプロパティは保持される
  assertEquals(updatedTicket.id, originalTicket.id);
  assertEquals(updatedTicket.matchName, originalTicket.matchName);
  assertEquals(updatedTicket.saleStartDate?.getTime(), originalTicket.saleStartDate?.getTime());
});
