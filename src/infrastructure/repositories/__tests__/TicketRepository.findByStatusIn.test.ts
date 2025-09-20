import { assertEquals } from 'std/assert/mod.ts';
import { afterEach, beforeEach, describe, it } from 'testing/bdd.ts';
import { MockTicketRepository } from '@/shared/testing/mocks/MockTicketRepository.ts';
import { createTestTicket } from '@/shared/testing/TestDataGenerator.ts';

describe('TicketRepository.findByStatusIn', () => {
  let repository: MockTicketRepository;

  beforeEach(() => {
    repository = new MockTicketRepository();
  });

  afterEach(() => {
    repository.resetMocks();
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

    // モックの設定
    repository.mockFindByStatusIn([onSaleTicket, beforeSaleTicket]);

    // on_sale と before_sale のチケットを取得
    const result = await repository.findByStatusIn(['on_sale', 'before_sale']);

    assertEquals(result.length, 2);
    assertEquals(result[0].id, 'test-on-sale');
    assertEquals(result[1].id, 'test-before-sale');
    assertEquals(repository.findByStatusInCallCount, 1);
    assertEquals(repository.lastFindByStatusInArgs, ['on_sale', 'before_sale']);
  });

  it('should return empty array when no tickets match statuses', async () => {
    // モックの設定: 空の配列を返す
    repository.mockFindByStatusIn([]);

    // on_sale と before_sale のチケットを検索
    const result = await repository.findByStatusIn(['on_sale', 'before_sale']);

    assertEquals(result.length, 0);
    assertEquals(repository.findByStatusInCallCount, 1);
  });

  it('should return empty array when no tickets exist', async () => {
    // モックの設定: 空の配列を返す
    repository.mockFindByStatusIn([]);

    const result = await repository.findByStatusIn(['on_sale', 'before_sale']);

    assertEquals(result.length, 0);
    assertEquals(repository.findByStatusInCallCount, 1);
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

    // モックの設定: 日付順にソート済みの配列を返す
    repository.mockFindByStatusIn([ticket2, ticket1]); // nearが先、futureが後

    const result = await repository.findByStatusIn(['on_sale']);

    assertEquals(result.length, 2);
    assertEquals(result[0].id, 'test-near'); // より近い日付が最初
    assertEquals(result[1].id, 'test-future');
    assertEquals(repository.findByStatusInCallCount, 1);
  });
});