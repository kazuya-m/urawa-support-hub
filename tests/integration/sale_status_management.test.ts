import { assertEquals, assertExists } from 'https://deno.land/std@0.210.0/testing/asserts.ts';
import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { cleanupTestData } from '../utils/test-supabase.ts';
import { createTestSupabaseClient } from '../utils/test-supabase.ts';

Deno.test(
  'Sale Status Management Integration - Complete State Transition Flow',
  { permissions: { env: true, net: ['127.0.0.1'], sys: true } },
  async () => {
    const client = createTestSupabaseClient();
    const ticketRepository = new TicketRepositoryImpl(client);
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
      assertEquals(saveResult1.isNew, true, 'First save should be new');
      assertEquals(
        saveResult1.ticket?.requiresNotification(),
        true,
        'Should require notification when before sale',
      );

      // 2. 販売中状態への遷移
      const onSaleTicket = await Ticket.createNew({
        matchName: `テスト対戦 ${testId}`,
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

      const saveResult2 = await ticketRepository.upsert(onSaleTicket);
      assertEquals(saveResult2.isNew, false, 'Second save should be update');
      assertEquals(saveResult2.hasChanged, true, 'Status change should be detected');
      assertEquals(saveResult2.ticket?.saleStatus, 'on_sale', 'Status should be on_sale');
      assertEquals(
        saveResult2.ticket?.requiresNotification(),
        false,
        'Should not require notification when on sale',
      );

      // 3. 販売終了状態への遷移
      const endedTicket = await Ticket.createNew({
        matchName: `テスト対戦 ${testId}`,
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

      const saveResult3 = await ticketRepository.upsert(endedTicket);
      assertEquals(saveResult3.isNew, false, 'Third save should be update');
      assertEquals(saveResult3.hasChanged, true, 'Status change should be detected');
      assertEquals(saveResult3.ticket?.saleStatus, 'ended', 'Status should be ended');
      assertEquals(
        saveResult3.ticket?.requiresNotification(),
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
  },
);

Deno.test(
  'Sale Status Management - Notification Control Logic',
  { permissions: { env: true, net: ['127.0.0.1'], sys: true } },
  async () => {
    const client = createTestSupabaseClient();
    const ticketRepository = new TicketRepositoryImpl(client);
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
      assertEquals(
        result1.ticket?.requiresNotification(),
        true,
        'New before_sale ticket should require notification',
      );

      // 通知スケジュール済みに更新
      const scheduledTicket = await Ticket.createNew({
        matchName: `通知テスト ${testId}`,
        matchDate: new Date('2024-09-15T14:00:00Z'),
        saleStartDate: new Date('2024-08-15T10:00:00Z'),
        venue: 'テストスタジアム',
        ticketTypes: ['S席'],
        ticketUrl: 'https://example.com/tickets',
        scrapedAt: new Date('2024-08-10T12:00:00Z'),
        saleStatus: 'before_sale',
        notificationScheduled: true,
      });

      const result2 = await ticketRepository.upsert(scheduledTicket);
      assertEquals(
        result2.ticket?.requiresNotification(),
        false,
        'Scheduled ticket should not require notification',
      );

      // 販売中に変更 - 通知不要
      const onSaleTicket = await Ticket.createNew({
        matchName: `通知テスト ${testId}`,
        matchDate: new Date('2024-09-15T14:00:00Z'),
        saleStartDate: new Date('2024-08-15T10:00:00Z'),
        saleEndDate: new Date('2024-09-12T23:59:00Z'),
        venue: 'テストスタジアム',
        ticketTypes: ['S席'],
        ticketUrl: 'https://example.com/tickets',
        scrapedAt: new Date('2024-08-20T12:00:00Z'),
        saleStatus: 'on_sale',
        notificationScheduled: true,
      });

      const result3 = await ticketRepository.upsert(onSaleTicket);
      assertEquals(
        result3.ticket?.requiresNotification(),
        false,
        'On-sale ticket should not require notification',
      );
    } finally {
      await cleanupTestData(client, 'tickets', `match_name LIKE '%${testId}%'`);
    }
  },
);

Deno.test(
  'Sale Status Management - ScrapedAt Timestamp Tracking',
  { permissions: { env: true, net: ['127.0.0.1'], sys: true } },
  async () => {
    const client = createTestSupabaseClient();
    const ticketRepository = new TicketRepositoryImpl(client);
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

      await ticketRepository.upsert(ticket1);

      // 2回目スクレイピング（状態変化なし）
      const ticket2 = await Ticket.createNew({
        matchName: `スクレイピング時刻テスト ${testId}`,
        matchDate: new Date('2024-09-15T14:00:00Z'),
        saleStartDate: new Date('2024-08-15T10:00:00Z'),
        venue: 'テストスタジアム',
        ticketTypes: ['S席'],
        ticketUrl: 'https://example.com/tickets',
        scrapedAt: secondScrapedAt,
        saleStatus: 'before_sale',
        notificationScheduled: false,
      });

      const result = await ticketRepository.upsert(ticket2);

      // スクレイピング時刻は更新されるべき
      assertEquals(
        result.ticket?.scrapedAt.toISOString(),
        secondScrapedAt.toISOString(),
        'ScrapedAt should be updated',
      );
    } finally {
      await cleanupTestData(client, 'tickets', `match_name LIKE '%${testId}%'`);
    }
  },
);
