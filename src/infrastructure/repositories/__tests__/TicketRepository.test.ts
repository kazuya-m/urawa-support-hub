import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import { TicketRepository } from '../TicketRepository.ts';
import { Ticket } from '@/domain/entities/index.ts';
import { TicketRow } from '@/infrastructure/types/database.ts';
import {
  createMockSupabaseClient,
  createUpsertMockSupabaseClient,
} from './test-utils/SupabaseMock.ts';
import { DatabaseError } from '@/shared/errors/index.ts';

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
    venue: 'テストスタジアム',
    ticketTypes: ['test'],
    ticketUrl: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
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
    saleStartDate: new Date('2025-03-01T01:00:00.000Z'),
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
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
    saleStartDate: new Date('2025-03-01T02:00:00.000Z'),
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
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
    saleStartDate: new Date('2025-03-01T01:00:00.000Z'), // UTCで統一
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席'],
    ticketUrl: 'https://example.com/test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    scrapedAt: fixedScrapedAt,
    saleStatus: 'before_sale',
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
    saleStartDate: new Date(), // 今日
    venue: 'テストスタジアム',
    ticketTypes: ['test'],
    ticketUrl: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
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
    saleStartDate: new Date(), // 今日
    venue: 'テストスタジアム',
    ticketTypes: ['test'],
    ticketUrl: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
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
    saleStartDate: new Date('2025-03-01T01:00:00.000Z'),
    venue: 'パナソニックスタジアム吹田',
    ticketTypes: ['ビジター席', 'ホーム席'], // ホーム席を追加
    ticketUrl: 'https://example.com/test',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    saleStatus: 'before_sale',
  });

  const result = await repository.upsert(updatedTicket);

  // upsertはTicketを直接返す
  assertEquals(result.id, 'test-id');
  assertEquals(result.ticketTypes.includes('ビジター席'), true);
  assertEquals(result.ticketTypes.includes('ホーム席'), true);
  assertEquals(result.ticketTypes.length, 2);
});
