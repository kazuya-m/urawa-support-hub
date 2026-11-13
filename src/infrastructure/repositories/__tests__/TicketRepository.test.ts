import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import { TicketRepository } from '../TicketRepository.ts';
import { Ticket } from '@/domain/entities/index.ts';
import { TicketRow } from '@/infrastructure/types/database.ts';
import {
  createMockSupabaseClient,
  createUpsertMockSupabaseClient,
} from './test-utils/SupabaseMock.ts';
import { DatabaseError } from '@/shared/errors/index.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

Deno.test('SupabaseTicketRepository - findById with null handling', async () => {
  const mockTicketRow: TicketRow = {
    id: 'test-id',
    match_name: 'テスト試合',
    match_date: '2025-03-15T19:30:00+09:00',
    home_team: 'ホームチーム',
    away_team: 'アウェイチーム',
    competition: 'J1リーグ',
    sale_start_date: '2025-03-01T01:00:00.000Z',
    sale_end_date: null,
    venue: 'テストスタジアム',
    ticket_types: ['ビジター席'],
    ticket_url: 'https://example.com/test',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    scraped_at: '2025-01-01T00:00:00Z',
    sale_status: 'before_sale',
    notification_scheduled: false,
  };

  const mockClient = createMockSupabaseClient([mockTicketRow]);
  const repository = new TicketRepository(mockClient);

  const result = await repository.findById('test-id');

  assertEquals(result?.id, 'test-id');
  assertEquals(result?.matchName, 'テスト試合');
});

Deno.test('SupabaseTicketRepository - upsert error handling', async () => {
  const mockClient = createMockSupabaseClient([], {
    shouldError: true,
    errorMessage: 'Database error',
  });
  const repository = new TicketRepository(mockClient);

  const testTicket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'テスト試合',
    matchDate: new Date(),
    homeTeam: 'ホーム',
    awayTeam: 'アウェイ',
    competition: 'J1リーグ',
    saleStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    saleEndDate: null,
    venue: 'テストスタジアム',
    ticketTypes: ['test'],
    ticketUrl: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  await assertRejects(
    () => repository.upsert(testTicket),
    DatabaseError,
    '[TicketRepository.upsert] Database error',
  );
});

Deno.test('TicketRepository - upsert creates new ticket', async () => {
  const mockTicketRow = {
    id: 'test-id',
    match_name: 'ガンバ大阪 vs 浦和レッズ',
    match_date: '2025-03-15T19:30:00+09:00',
    home_team: 'ガンバ大阪',
    away_team: '浦和レッズ',
    sale_start_date: '2025-03-01T01:00:00.000Z',
    sale_end_date: null,
    venue: 'パナソニックスタジアム吹田',
    ticket_types: ['ビジター席'],
    ticket_url: 'https://example.com/test',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    scraped_at: '2025-01-01T00:00:00Z',
    sale_status: 'before_sale',
    notification_scheduled: false,
  };

  const mockClient = createUpsertMockSupabaseClient({
    existingData: null, // 既存レコードなし
    upsertData: mockTicketRow,
  });

  const repository = new TicketRepository(mockClient);

  const testTicket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'ガンバ大阪 vs 浦和レッズ',
    matchDate: new Date('2025-03-15T19:30:00+09:00'),
    homeTeam: 'ガンバ大阪',
    awayTeam: '浦和レッズ',
    competition: null,
    saleStartDate: new Date('2025-03-01T01:00:00.000Z'),
    saleEndDate: null,
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  const result = await repository.upsert(testTicket);

  assertEquals(result.id, 'test-id');
  assertEquals(result.matchName, 'ガンバ大阪 vs 浦和レッズ');
});

Deno.test('TicketRepository - upsert updates existing ticket', async () => {
  const existingTicketRow = {
    id: 'test-id',
    match_name: 'ガンバ大阪 vs 浦和レッズ',
    match_date: '2025-03-15T19:30:00+09:00',
    home_team: 'ガンバ大阪',
    away_team: '浦和レッズ',
    sale_start_date: '2025-03-01T01:00:00.000Z',
    sale_end_date: null,
    venue: 'パナソニックスタジアム吹田',
    ticket_types: ['ビジター席'],
    ticket_url: 'https://example.com/test',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    scraped_at: '2025-01-01T00:00:00Z',
    sale_status: 'before_sale',
    notification_scheduled: false,
  };

  const updatedTicketRow = {
    ...existingTicketRow,
    sale_start_date: '2025-03-01T02:00:00.000Z', // 1時間後に変更
    updated_at: new Date().toISOString(),
  };

  const mockClient = createUpsertMockSupabaseClient({
    existingData: existingTicketRow,
    upsertData: updatedTicketRow,
  });

  const repository = new TicketRepository(mockClient);

  const updatedTicket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'ガンバ大阪 vs 浦和レッズ',
    matchDate: new Date('2025-03-15T19:30:00+09:00'),
    homeTeam: 'ガンバ大阪',
    awayTeam: '浦和レッズ',
    competition: null,
    saleStartDate: new Date('2025-03-01T02:00:00.000Z'),
    saleEndDate: null,
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  const result = await repository.upsert(updatedTicket);

  // upsertはTicketを直接返す
  assertEquals(result.id, 'test-id');
  assertEquals(
    result.saleStartDate?.getTime(),
    new Date('2025-03-01T02:00:00.000Z').getTime(),
  );
});

Deno.test('TicketRepository - upsert detects no changes', async () => {
  const fixedScrapedAt = new Date('2025-01-15T12:00:00Z');
  const unchangedTicketRow = {
    id: 'test-id',
    match_name: 'ガンバ大阪 vs 浦和レッズ',
    match_date: '2025-03-15T19:30:00+09:00',
    home_team: 'ガンバ大阪',
    away_team: '浦和レッズ',
    sale_start_date: '2025-03-01T01:00:00.000Z',
    sale_end_date: null,
    venue: 'パナソニックスタジアム吹田',
    ticket_types: ['ビジター席'],
    ticket_url: 'https://example.com/test',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    scraped_at: fixedScrapedAt.toISOString(),
    sale_status: 'before_sale',
    notification_scheduled: false,
  };

  const mockClient = createUpsertMockSupabaseClient({
    existingData: unchangedTicketRow,
    upsertData: unchangedTicketRow,
  });

  const repository = new TicketRepository(mockClient);

  const sameTicket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'ガンバ大阪 vs 浦和レッズ',
    matchDate: new Date('2025-03-15T19:30:00+09:00'),
    homeTeam: 'ガンバ大阪',
    awayTeam: '浦和レッズ',
    competition: null,
    saleStartDate: new Date('2025-03-01T01:00:00.000Z'), // UTCで統一
    saleEndDate: null,
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    scrapedAt: fixedScrapedAt,
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  const result = await repository.upsert(sameTicket);

  // upsertはTicketを直接返す
  assertEquals(result.id, 'test-id');
  assertEquals(result.matchName, 'ガンバ大阪 vs 浦和レッズ');
});

Deno.test('TicketRepository - upsert handles database error properly', async () => {
  const mockClient = createUpsertMockSupabaseClient({
    upsertError: { code: '42P01', message: 'table does not exist' },
  });

  const repository = new TicketRepository(mockClient);

  const testTicket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'テスト試合',
    matchDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
    homeTeam: 'ホーム',
    awayTeam: 'アウェイ',
    competition: null,
    saleStartDate: new Date(), // 今日
    saleEndDate: null,
    venue: 'テストスタジアム',
    ticketTypes: ['test'],
    ticketUrl: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  await assertRejects(
    () => repository.upsert(testTicket),
    DatabaseError,
    '[TicketRepository.upsert] table does not exist',
  );
});

Deno.test('TicketRepository - upsert handles upsert error properly', async () => {
  const mockClient = createUpsertMockSupabaseClient({
    upsertError: { code: '23505', message: 'duplicate key error' },
  });

  const repository = new TicketRepository(mockClient);

  const testTicket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'テスト試合',
    matchDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
    homeTeam: 'ホーム',
    awayTeam: 'アウェイ',
    competition: null,
    saleStartDate: new Date(), // 今日
    saleEndDate: null,
    venue: 'テストスタジアム',
    ticketTypes: ['test'],
    ticketUrl: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  await assertRejects(
    () => repository.upsert(testTicket),
    DatabaseError,
    '[TicketRepository.upsert] duplicate key error',
  );
});

Deno.test('TicketRepository - upsert detects ticket_types array changes', async () => {
  const existingTicketRow = {
    id: 'test-id',
    match_name: 'ガンバ大阪 vs 浦和レッズ',
    match_date: '2025-03-15T19:30:00+09:00',
    home_team: 'ガンバ大阪',
    away_team: '浦和レッズ',
    sale_start_date: '2025-03-01T01:00:00.000Z',
    sale_end_date: null,
    venue: 'パナソニックスタジアム吹田',
    ticket_types: ['ビジター席'],
    ticket_url: 'https://example.com/test',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    scraped_at: '2025-01-01T00:00:00Z',
    sale_status: 'before_sale',
    notification_scheduled: false,
  };

  const updatedTicketRow = {
    ...existingTicketRow,
    ticket_types: ['ビジター席', 'ホーム席'],
    updated_at: new Date().toISOString(),
  };

  const mockClient = createUpsertMockSupabaseClient({
    existingData: existingTicketRow,
    upsertData: updatedTicketRow,
  });

  const repository = new TicketRepository(mockClient);

  const updatedTicket = Ticket.fromExisting({
    id: 'test-id',
    matchName: 'ガンバ大阪 vs 浦和レッズ',
    matchDate: new Date('2025-03-15T19:30:00+09:00'),
    homeTeam: 'ガンバ大阪',
    awayTeam: '浦和レッズ',
    competition: null,
    saleStartDate: new Date('2025-03-01T01:00:00.000Z'),
    saleEndDate: null,
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席', 'ホーム席'], // ホーム席を追加
    ticketUrl: 'https://example.com/test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
    notificationScheduled: false,
  });

  const result = await repository.upsert(updatedTicket);

  // upsertはTicketを直接返す
  assertEquals(result.id, 'test-id');
  assertEquals(result.ticketTypes.includes('ビジター席'), true);
  assertEquals(result.ticketTypes.includes('ホーム席'), true);
  assertEquals(result.ticketTypes.length, 2);
});

/**
 * findByStatusIn 用: from().select().in().order() の呼び出しを記録し、指定の結果を返す Supabase クライアントのスタブ
 */
function createFindByStatusInClient(
  result: { data: TicketRow[] | null; error: { message: string; code?: string } | null },
) {
  const calls: unknown[][] = [];
  const query = {
    select: (...args: unknown[]) => {
      calls.push(['select', ...args]);
      return query;
    },
    in: (...args: unknown[]) => {
      calls.push(['in', ...args]);
      return query;
    },
    order: (...args: unknown[]) => {
      calls.push(['order', ...args]);
      return Promise.resolve(result);
    },
  };
  const client = {
    from: (table: string) => {
      calls.push(['from', table]);
      return query;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

function createTicketRow(id: string, saleStatus: TicketRow['sale_status']): TicketRow {
  return {
    id,
    match_name: `試合 ${id}`,
    match_date: '2025-03-15T19:30:00+09:00',
    home_team: null,
    away_team: null,
    competition: null,
    sale_start_date: '2025-03-01T01:00:00.000Z',
    sale_end_date: null,
    venue: null,
    ticket_types: [],
    ticket_url: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    scraped_at: '2025-01-01T00:00:00Z',
    sale_status: saleStatus,
    notification_scheduled: false,
  };
}

Deno.test('TicketRepository - findByStatusIn', async (t) => {
  await t.step('指定した販売状態で絞り込み、試合日の昇順で取得する', async () => {
    const { client, calls } = createFindByStatusInClient({
      data: [createTicketRow('t-1', 'on_sale'), createTicketRow('t-2', 'before_sale')],
      error: null,
    });
    const repository = new TicketRepository(client);

    const result = await repository.findByStatusIn(['on_sale', 'before_sale']);

    assertEquals(calls, [
      ['from', 'tickets'],
      ['select', '*'],
      ['in', 'sale_status', ['on_sale', 'before_sale']],
      ['order', 'match_date', { ascending: true }],
    ]);
    // DB が返した順序のまま Ticket に変換する
    assertEquals(result.map((ticket) => ticket.id), ['t-1', 't-2']);
    assertEquals(result.map((ticket) => ticket.saleStatus), ['on_sale', 'before_sale']);
  });

  await t.step('該当がなければ空配列を返す', async () => {
    const { client } = createFindByStatusInClient({ data: [], error: null });
    const repository = new TicketRepository(client);

    assertEquals(await repository.findByStatusIn(['on_sale']), []);
  });

  await t.step('Supabase がエラーを返したら DatabaseError を投げる', async () => {
    const { client } = createFindByStatusInClient({
      data: null,
      error: { message: 'connection refused', code: 'PGRST000' },
    });
    const repository = new TicketRepository(client);

    const error = await assertRejects(
      () => repository.findByStatusIn(['on_sale']),
      DatabaseError,
    );
    assertEquals(error.message, '[TicketRepository.findByStatusIn] connection refused');
  });
});
