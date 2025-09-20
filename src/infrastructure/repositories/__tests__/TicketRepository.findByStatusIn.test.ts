import { assertEquals } from 'std/assert/mod.ts';
import { afterEach, beforeEach, describe, it } from 'testing/bdd.ts';
import { createTestSupabaseClient } from '@/shared/testing/TestSupabaseClient.ts';
import { TicketRepository } from '../TicketRepository.ts';
import { createTestTicket } from '@/shared/testing/TestDataGenerator.ts';
import { SupabaseClient } from '@supabase/supabase-js';

describe('TicketRepository.findByStatusIn', () => {
  let client: SupabaseClient;
  let repository: TicketRepository;

  beforeEach(async () => {
    client = createTestSupabaseClient();
    repository = new TicketRepository(client);

    // テスト用データをクリーンアップ
    await client.from('tickets').delete().neq('id', '');
  });

  afterEach(async () => {
    // テストデータをクリーンアップ
    await client.from('tickets').delete().neq('id', '');
  });

  it('should return tickets with specified statuses', async () => {
    // テスト用チケットを作成
    const onSaleTicket = createTestTicket({
      id: 'test-on-sale',
      saleStatus: 'on_sale',
      matchName: 'Test Match 1',
    });
    const beforeSaleTicket = createTestTicket({
      id: 'test-before-sale',
      saleStatus: 'before_sale',
      matchName: 'Test Match 2',
    });
    const endedTicket = createTestTicket({
      id: 'test-ended',
      saleStatus: 'ended',
      matchName: 'Test Match 3',
    });

    // データベースに保存
    await repository.upsert(onSaleTicket);
    await repository.upsert(beforeSaleTicket);
    await repository.upsert(endedTicket);

    // on_sale と before_sale のチケットを取得
    const result = await repository.findByStatusIn(['on_sale', 'before_sale']);

    assertEquals(result.length, 2);
    assertEquals(result[0].id, 'test-on-sale');
    assertEquals(result[1].id, 'test-before-sale');
  });

  it('should return empty array when no tickets match statuses', async () => {
    // ended のチケットのみ作成
    const endedTicket = createTestTicket({
      id: 'test-ended',
      saleStatus: 'ended',
    });
    await repository.upsert(endedTicket);

    // on_sale と before_sale のチケットを検索
    const result = await repository.findByStatusIn(['on_sale', 'before_sale']);

    assertEquals(result.length, 0);
  });

  it('should return empty array when no tickets exist', async () => {
    const result = await repository.findByStatusIn(['on_sale', 'before_sale']);
    assertEquals(result.length, 0);
  });

  it('should order by match_date ascending', async () => {
    const futureDate = new Date('2025-12-31');
    const nearDate = new Date('2025-06-15');

    const ticket1 = createTestTicket({
      id: 'test-future',
      saleStatus: 'on_sale',
      matchDate: futureDate,
    });
    const ticket2 = createTestTicket({
      id: 'test-near',
      saleStatus: 'on_sale',
      matchDate: nearDate,
    });

    await repository.upsert(ticket1);
    await repository.upsert(ticket2);

    const result = await repository.findByStatusIn(['on_sale']);

    assertEquals(result.length, 2);
    assertEquals(result[0].id, 'test-near'); // より近い日付が最初
    assertEquals(result[1].id, 'test-future');
  });
});
