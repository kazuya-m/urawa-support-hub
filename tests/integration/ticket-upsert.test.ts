import { assertEquals } from 'jsr:@std/assert';
import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketUpsertResult } from '@/application/types/UseCaseResults.ts';
import {
  cleanupTestData,
  createTestSupabaseClient,
  withTestCleanup,
} from '../utils/test-supabase.ts';

// 統合テスト - 実際のSupabaseクライアントを使用してUPSERT機能を検証
Deno.test(
  'Ticket UPSERT - end to end flow',
  { permissions: { env: true, net: ['127.0.0.1'] } },
  async () => {
    const client = createTestSupabaseClient();
    const repository = new TicketRepositoryImpl(client);

    // テスト用チケットデータ
    const baseTicket = {
      id: 'test-upsert-001',
      matchName: 'ガンバ大阪 vs 浦和レッズ',
      matchDate: new Date('2025-03-15T19:30:00+09:00'),
      homeTeam: 'ガンバ大阪',
      awayTeam: '浦和レッズ',
      saleStartDate: new Date('2025-03-01T10:00:00+09:00'),
      venue: 'パナソニックスタジアム吹田',
      ticketTypes: ['ビジター席'],
      ticketUrl: 'https://example.com/test-upsert',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      scrapedAt: new Date(),
      saleStatus: 'before_sale' as const,
    };

    // テスト前にクリーンアップ
    await cleanupTestData(client, 'tickets', `id = 'test-upsert-001'`);

    try {
      // 1. 新規チケット作成
      const newTicket = Ticket.fromExisting(baseTicket);
      const result1 = await repository.upsert(newTicket);

      assertEquals(result1.isNew, true);
      // 新規作成時はhasChangedは常にfalse（前のデータがないため）
      assertEquals(result1.hasChanged, false);
      assertEquals(result1.ticket.matchName, 'ガンバ大阪 vs 浦和レッズ');

      // 2. 同じデータで再度UPSERT（変更なし）
      const sameTicket = Ticket.fromExisting(baseTicket);
      const result2 = await repository.upsert(sameTicket);

      assertEquals(result2.isNew, false);
      assertEquals(result2.hasChanged, false);
      assertEquals(result2.ticket.id, baseTicket.id);

      // 3. データを変更してUPSERT（更新）
      const updatedSaleStartDate = new Date('2025-03-01T11:00:00+09:00');
      const updatedTicketData = {
        ...baseTicket,
        saleStartDate: updatedSaleStartDate, // 時刻変更
        ticketTypes: ['ビジター席', '追加席種'], // 席種追加
        updatedAt: new Date(),
      };

      const updatedTicket = Ticket.fromExisting(updatedTicketData);
      const result3 = await repository.upsert(updatedTicket);

      assertEquals(result3.isNew, false);
      assertEquals(result3.hasChanged, true);
      // タイムゾーン環境の差異を回避するため、ISO文字列で比較
      assertEquals(result3.ticket.saleStartDate?.toISOString(), updatedSaleStartDate.toISOString());
      assertEquals(result3.ticket.ticketTypes.length, 2);

      // 4. データベースから直接取得して確認
      const retrievedTicket = await repository.findById(baseTicket.id);
      assertEquals(
        retrievedTicket?.saleStartDate?.toISOString(),
        updatedSaleStartDate.toISOString(),
      );
      assertEquals(retrievedTicket?.ticketTypes.length, 2);
    } finally {
      // テストデータのクリーンアップ
      await cleanupTestData(client, 'tickets', `id = 'test-upsert-001'`);
    }
  },
);

Deno.test(
  'Ticket UPSERT - idempotency test',
  { permissions: { env: true, net: ['127.0.0.1'] } },
  async () => {
    const client = createTestSupabaseClient();
    const repository = new TicketRepositoryImpl(client);

    // テスト前にクリーンアップ
    await cleanupTestData(client, 'tickets', `id = 'test-idempotent-001'`);

    const ticketData = {
      id: 'test-idempotent-001',
      matchName: 'FC東京 vs 浦和レッズ',
      matchDate: new Date('2025-04-20T19:00:00+09:00'),
      homeTeam: 'FC東京',
      awayTeam: '浦和レッズ',
      saleStartDate: new Date('2025-04-01T12:00:00+09:00'),
      venue: '味の素スタジアム',
      ticketTypes: ['アウェイ指定席'],
      ticketUrl: 'https://example.com/test-idempotent',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      scrapedAt: new Date(),
      saleStatus: 'before_sale' as const,
    };

    try {
      // 同じ操作を複数回実行
      const results: TicketUpsertResult[] = [];
      for (let i = 0; i < 3; i++) {
        const ticket = Ticket.fromExisting(ticketData);
        const result = await repository.upsert(ticket);
        results.push(result);
      }

      // 1回目は新規作成、2回目以降は変更なし
      assertEquals(results[0].isNew, true);
      assertEquals(results[0].hasChanged, false);

      assertEquals(results[1].isNew, false);
      assertEquals(results[1].hasChanged, false);

      assertEquals(results[2].isNew, false);
      assertEquals(results[2].hasChanged, false);

      // 全て同じチケットIDを返すことを確認
      const ids = results.map((r) => r.ticket.id);
      assertEquals(new Set(ids).size, 1); // 重複なし = 1つだけ
    } finally {
      await cleanupTestData(client, 'tickets', `id = 'test-idempotent-001'`);
    }
  },
);

Deno.test('Ticket UPSERT - UNIQUE constraint test', {
  permissions: { env: true, net: ['127.0.0.1'] },
}, async () => {
  const client = createTestSupabaseClient();
  const repository = new TicketRepositoryImpl(client);

  // テスト前にクリーンアップ
  await cleanupTestData(client, 'tickets', `match_name = 'セレッソ大阪 vs 浦和レッズ'`);

  const baseData = {
    matchName: 'セレッソ大阪 vs 浦和レッズ',
    matchDate: new Date('2025-05-10T19:30:00+09:00'),
    venue: 'ヤンマースタジアム長居',
    homeTeam: 'セレッソ大阪',
    awayTeam: '浦和レッズ',
    saleStartDate: new Date('2025-04-25T10:00:00+09:00'),
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/cerezo',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale' as const,
  };

  try {
    // 異なるIDでも同じ (match_name, venue, match_date) の組み合わせ
    const ticket1 = Ticket.fromExisting({ ...baseData, id: 'unique-test-001' });
    const ticket2 = Ticket.fromExisting({ ...baseData, id: 'unique-test-002' });

    // 1つ目を作成
    const result1 = await repository.upsert(ticket1);
    assertEquals(result1.isNew, true);

    // 2つ目を作成 - 異なるIDなので新規作成される（UNIQUE制約を削除したため）
    const result2 = await repository.upsert(ticket2);
    assertEquals(result2.isNew, true);

    // データベースに2件存在することを確認（IDが異なるため）
    const allTickets = await repository.findByColumn('match_name', baseData.matchName);
    assertEquals(allTickets.length, 2);
  } finally {
    await cleanupTestData(client, 'tickets', `match_name = 'セレッソ大阪 vs 浦和レッズ'`);
  }
});
