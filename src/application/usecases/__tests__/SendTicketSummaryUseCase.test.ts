import { assertEquals } from 'std/assert/mod.ts';
import { afterEach, beforeEach, describe, it } from 'testing/bdd.ts';
import { SendTicketSummaryUseCase } from '../SendTicketSummaryUseCase.ts';
import { MockTicketRepository } from '@/shared/testing/mocks/MockTicketRepository.ts';
import { MockLineClient } from '@/shared/testing/mocks/MockLineClient.ts';
import { createTestTicket } from '@/shared/testing/TestDataGenerator.ts';

describe('SendTicketSummaryUseCase', () => {
  let useCase: SendTicketSummaryUseCase;
  let mockTicketRepository: MockTicketRepository;
  let mockLineClient: MockLineClient;

  beforeEach(() => {
    mockTicketRepository = new MockTicketRepository();
    mockLineClient = new MockLineClient();
    useCase = new SendTicketSummaryUseCase(mockTicketRepository, mockLineClient);
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    mockTicketRepository.resetMocks();
    mockLineClient.resetMocks();
  });

  it('should send ticket summary when tickets exist', async () => {
    // テストデータ準備
    const ticket1 = createTestTicket({
      id: 'ticket-1',
      matchName: '浦和レッズ vs FC東京',
    });
    const ticket2 = createTestTicket({
      id: 'ticket-2',
      matchName: '浦和レッズ vs 横浜F・マリノス',
    });

    // モックの設定
    mockTicketRepository.mockFindByStatusIn([ticket1, ticket2]);

    // 実行
    await useCase.execute();

    // 検証
    assertEquals(mockTicketRepository.findByStatusInCallCount, 1);
    assertEquals(mockTicketRepository.lastFindByStatusInArgs, ['on_sale', 'before_sale']);

    assertEquals(mockLineClient.broadcastCallCount, 1);

    const sentMessage = mockLineClient.lastBroadcastMessage;
    assertEquals(sentMessage?.type, 'flex');

    // FlexメッセージのaltTextを検証（型を明示的にキャスト）
    assertEquals((sentMessage?.altText as string)?.includes('チケット情報'), true);
  });

  it('should not send message when no tickets exist', async () => {
    // モックの設定: 空の配列を返す
    mockTicketRepository.mockFindByStatusIn([]);

    // 実行
    await useCase.execute();

    // 検証: チケットが0件の場合は送信しない
    assertEquals(mockLineClient.broadcastCallCount, 0);
  });

  it('should handle repository errors', async () => {
    // モックの設定: エラーを投げる
    mockTicketRepository.setFindByStatusInError(new Error('Database error'));

    // 実行
    let thrownError: Error | undefined;
    try {
      await useCase.execute();
    } catch (error) {
      thrownError = error as Error;
    }

    // 検証
    assertEquals(thrownError?.message, 'Database error');
    assertEquals(mockLineClient.broadcastCallCount, 0);
  });

  it('should handle LINE client errors', async () => {
    // モックの設定
    mockTicketRepository.mockFindByStatusIn([
      createTestTicket({ id: 'ticket-1', matchName: '浦和レッズ vs FC東京' }),
    ]);
    mockLineClient.mockBroadcastError(new Error('LINE API error'));

    // 実行
    let thrownError: Error | undefined;
    try {
      await useCase.execute();
    } catch (error) {
      thrownError = error as Error;
    }

    // 検証
    assertEquals(thrownError?.message, 'LINE API error');
    assertEquals(mockLineClient.broadcastCallCount, 1);
  });
});
