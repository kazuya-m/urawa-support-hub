import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { cleanupTestData } from '../utils/test-supabase.ts';
import { createTestSupabaseClient } from '../utils/test-supabase.ts';

Deno.test('Sale Status Management Integration - Complete State Transition Flow', async () => {
  const client = createTestSupabaseClient();
  const ticketRepository = new TicketRepository(client);
  const testId = 'test-sale-status-' + Date.now();

  try {
    // 1. 発売前チケットの作成
    const beforeSaleTicket = await Ticket.createNew({
      matchName: `テスト対戦 ${testId}`,
      matchDate: new Date('2024-09-15T14:00:00Z'),
      saleStartDate: new Date('2024-08-15T10:00:00Z'),
      venue: 'テストスタジアム',
      ticketTypes: ['S席', 'A席'],
      ticketUrl: 'https://example.com/tickets',
      scrapedAt: new Date('2024-08-10T12:00:00Z'),
      saleStatus: 'before_sale',
      notificationScheduled: false,
    });

    // データベースに保存
    const saveResult1 = await ticketRepository.upsert(beforeSaleTicket);
    // saveResult1 is now a Ticket, not TicketUpsertResult
    assertEquals(
      saveResult1.requiresNotification(),
      true,
      'Should require notification when before sale',
    );

    // 2. 販売中状態への遷移（同じIDで更新）
    const existingTicket = await ticketRepository.findById(saveResult1.id);
    const onSaleTicket = Ticket.fromExisting({
      id: existingTicket!.id,
      matchName: existingTicket!.matchName,
      matchDate: existingTicket!.matchDate,
      homeTeam: existingTicket!.homeTeam,
      awayTeam: existingTicket!.awayTeam,
      saleStartDate: existingTicket!.saleStartDate,
      saleEndDate: existingTicket!.saleEndDate,
      venue: existingTicket!.venue,
      ticketTypes: existingTicket!.ticketTypes,
      ticketUrl: existingTicket!.ticketUrl,
      createdAt: existingTicket!.createdAt,
      updatedAt: existingTicket!.updatedAt,
      scrapedAt: new Date('2024-08-20T12:00:00Z'),
      saleStatus: 'on_sale' as const,
      notificationScheduled: existingTicket!.notificationScheduled,
    });

    const saveResult2 = await ticketRepository.upsert(onSaleTicket);
    // saveResult2 is now a Ticket, not TicketUpsertResult
    assertEquals(saveResult2.saleStatus, 'on_sale', 'Status should be on_sale');
    assertEquals(
      saveResult2.requiresNotification(),
      false,
      'Should not require notification when on sale',
    );

    // 3. 販売終了状態への遷移（同じIDで更新）
    const existingTicket2 = await ticketRepository.findById(saveResult1.id);
    const endedTicket = Ticket.fromExisting({
      id: existingTicket2!.id,
      matchName: existingTicket2!.matchName,
      matchDate: existingTicket2!.matchDate,
      homeTeam: existingTicket2!.homeTeam,
      awayTeam: existingTicket2!.awayTeam,
      saleStartDate: existingTicket2!.saleStartDate,
      saleEndDate: existingTicket2!.saleEndDate,
      venue: existingTicket2!.venue,
      ticketTypes: existingTicket2!.ticketTypes,
      ticketUrl: existingTicket2!.ticketUrl,
      createdAt: existingTicket2!.createdAt,
      updatedAt: existingTicket2!.updatedAt,
      scrapedAt: new Date('2024-09-13T12:00:00Z'),
      saleStatus: 'ended' as const,
      notificationScheduled: existingTicket2!.notificationScheduled,
    });

    const saveResult3 = await ticketRepository.upsert(endedTicket);
    // saveResult3 is now a Ticket, not TicketUpsertResult
    assertEquals(saveResult3.saleStatus, 'ended', 'Status should be ended');
    assertEquals(
      saveResult3.requiresNotification(),
      false,
      'Should not require notification when ended',
    );

    // 4. データ整合性確認
    const retrievedTicket = await ticketRepository.findById(beforeSaleTicket.id);
    assertExists(retrievedTicket, 'Ticket should be retrievable');
    assertEquals(retrievedTicket.saleStatus, 'ended', 'Final status should be ended');
    assertEquals(
      retrievedTicket.scrapedAt.toISOString(),
      endedTicket.scrapedAt.toISOString(),
      'ScrapedAt should be updated',
    );
  } finally {
    await cleanupTestData(client, 'tickets', `match_name LIKE '%${testId}%'`);
  }
});

Deno.test('Sale Status Management - Notification Control Logic', async () => {
  const client = createTestSupabaseClient();
  const ticketRepository = new TicketRepository(client);
  const testId = 'test-notification-' + Date.now();

  try {
    // 通知が必要な発売前チケット
    const beforeSaleTicket = await Ticket.createNew({
      matchName: `通知テスト ${testId}`,
      matchDate: new Date('2024-09-15T14:00:00Z'),
      saleStartDate: new Date('2024-08-15T10:00:00Z'),
      venue: 'テストスタジアム',
      ticketTypes: ['S席'],
      ticketUrl: 'https://example.com/tickets',
      scrapedAt: new Date('2024-08-10T12:00:00Z'),
      saleStatus: 'before_sale',
      notificationScheduled: false,
    });

    const result1 = await ticketRepository.upsert(beforeSaleTicket);
    // result1 is now a Ticket, not TicketUpsertResult
    assertEquals(
      result1.requiresNotification(),
      true,
      'New before_sale ticket should require notification',
    );

    // 通知スケジュール済みに更新（同じIDで更新）
    const existingForSchedule = await ticketRepository.findById(result1.id);
    const scheduledTicket = Ticket.fromExisting({
      id: existingForSchedule!.id,
      matchName: existingForSchedule!.matchName,
      matchDate: existingForSchedule!.matchDate,
      homeTeam: existingForSchedule!.homeTeam,
      awayTeam: existingForSchedule!.awayTeam,
      saleStartDate: existingForSchedule!.saleStartDate,
      saleEndDate: existingForSchedule!.saleEndDate,
      venue: existingForSchedule!.venue,
      ticketTypes: existingForSchedule!.ticketTypes,
      ticketUrl: existingForSchedule!.ticketUrl,
      createdAt: existingForSchedule!.createdAt,
      updatedAt: existingForSchedule!.updatedAt,
      scrapedAt: existingForSchedule!.scrapedAt,
      saleStatus: existingForSchedule!.saleStatus,
      notificationScheduled: true,
    });

    const result2 = await ticketRepository.upsert(scheduledTicket);
    // result2 is now a Ticket, not TicketUpsertResult
    assertEquals(
      result2.requiresNotification(),
      false,
      'Scheduled ticket should not require notification',
    );

    // 販売中に変更 - 通知不要（同じIDで更新）
    const existingForOnSale = await ticketRepository.findById(result1.id);
    const onSaleTicket = Ticket.fromExisting({
      id: existingForOnSale!.id,
      matchName: existingForOnSale!.matchName,
      matchDate: existingForOnSale!.matchDate,
      homeTeam: existingForOnSale!.homeTeam,
      awayTeam: existingForOnSale!.awayTeam,
      saleStartDate: existingForOnSale!.saleStartDate,
      saleEndDate: existingForOnSale!.saleEndDate,
      venue: existingForOnSale!.venue,
      ticketTypes: existingForOnSale!.ticketTypes,
      ticketUrl: existingForOnSale!.ticketUrl,
      createdAt: existingForOnSale!.createdAt,
      updatedAt: existingForOnSale!.updatedAt,
      scrapedAt: new Date('2024-08-20T12:00:00Z'),
      saleStatus: 'on_sale' as const,
      notificationScheduled: true,
    });

    const result3 = await ticketRepository.upsert(onSaleTicket);
    // result3 is now a Ticket, not TicketUpsertResult
    assertEquals(
      result3.requiresNotification(),
      false,
      'On-sale ticket should not require notification',
    );
  } finally {
    await cleanupTestData(client, 'tickets', `match_name LIKE '%${testId}%'`);
  }
});

Deno.test('Sale Status Management - ScrapedAt Timestamp Tracking', async () => {
  const client = createTestSupabaseClient();
  const ticketRepository = new TicketRepository(client);
  const testId = 'test-scraped-at-' + Date.now();

  try {
    const firstScrapedAt = new Date('2024-08-10T12:00:00Z');
    const secondScrapedAt = new Date('2024-08-20T15:30:00Z');

    // 初回スクレイピング
    const ticket1 = await Ticket.createNew({
      matchName: `スクレイピング時刻テスト ${testId}`,
      matchDate: new Date('2024-09-15T14:00:00Z'),
      saleStartDate: new Date('2024-08-15T10:00:00Z'),
      venue: 'テストスタジアム',
      ticketTypes: ['S席'],
      ticketUrl: 'https://example.com/tickets',
      scrapedAt: firstScrapedAt,
      saleStatus: 'before_sale',
      notificationScheduled: false,
    });

    const firstResult = await ticketRepository.upsert(ticket1);

    // 2回目スクレイピング（状態変化なし）
    const existingForScrapedAt = await ticketRepository.findById(firstResult.id);
    const ticket2 = Ticket.fromExisting({
      id: existingForScrapedAt!.id,
      matchName: existingForScrapedAt!.matchName,
      matchDate: existingForScrapedAt!.matchDate,
      homeTeam: existingForScrapedAt!.homeTeam,
      awayTeam: existingForScrapedAt!.awayTeam,
      saleStartDate: existingForScrapedAt!.saleStartDate,
      saleEndDate: existingForScrapedAt!.saleEndDate,
      venue: existingForScrapedAt!.venue,
      ticketTypes: existingForScrapedAt!.ticketTypes,
      ticketUrl: existingForScrapedAt!.ticketUrl,
      createdAt: existingForScrapedAt!.createdAt,
      updatedAt: existingForScrapedAt!.updatedAt,
      scrapedAt: secondScrapedAt,
      saleStatus: existingForScrapedAt!.saleStatus,
      notificationScheduled: existingForScrapedAt!.notificationScheduled,
    });

    const result = await ticketRepository.upsert(ticket2);

    // スクレイピング時刻は更新されるべき
    // result is now a Ticket, not TicketUpsertResult
    assertEquals(
      result.scrapedAt.toISOString(),
      secondScrapedAt.toISOString(),
      'ScrapedAt should be updated',
    );
  } finally {
    await cleanupTestData(client, 'tickets', `match_name LIKE '%${testId}%'`);
  }
});
