import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { TicketRepositoryImpl } from '../TicketRepositoryImpl.ts';
import { Ticket } from '@/domain/entities/index.ts';
import { TicketRow } from '@/infrastructure/types/database.ts';
import { createMockSupabaseClient } from './test-utils/SupabaseMock.ts';
import { RepositoryError } from '../../utils/error-handler.ts';

Deno.test('SupabaseTicketRepository - findById with null handling', async () => {
  const mockTicketRow: TicketRow = {
    id: 'test-id',
    match_name: 'テスト試合',
    match_date: '2025-03-15T19:30:00+09:00',
    home_team: 'ホームチーム',
    away_team: 'アウェイチーム',
    sale_start_date: '2025-03-01T10:00:00+09:00',
    sale_start_time: null,
    venue: 'テストスタジアム',
    ticket_types: ['ビジター席'],
    ticket_url: 'https://example.com/test',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  const mockClient = createMockSupabaseClient([mockTicketRow]);
  const repository = new TicketRepositoryImpl(mockClient);

  const result = await repository.findById('test-id');

  assertEquals(result?.id, 'test-id');
  assertEquals(result?.matchName, 'テスト試合');
  assertEquals(result?.saleStartTime, undefined);
});

Deno.test('SupabaseTicketRepository - save error handling', async () => {
  const mockClient = createMockSupabaseClient([], {
    shouldError: true,
    errorMessage: 'Database error',
  });
  const repository = new TicketRepositoryImpl(mockClient);

  const testTicket = new Ticket({
    id: 'test-id',
    matchName: 'テスト試合',
    matchDate: new Date(),
    homeTeam: 'ホーム',
    awayTeam: 'アウェイ',
    saleStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    venue: 'テストスタジアム',
    ticketTypes: ['test'],
    ticketUrl: 'https://example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await assertRejects(
    () => repository.save(testTicket),
    RepositoryError,
    'Failed to save ticket: Database error',
  );
});
