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
    // テストデータ準備（未来の試合日）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7日後

    const ticket1 = createTestTicket({
      id: 'ticket-1',
      matchName: '浦和レッズ vs FC東京',
      matchDate: futureDate,
    });
    const ticket2 = createTestTicket({
      id: 'ticket-2',
      matchName: '浦和レッズ vs 横浜F・マリノス',
      matchDate: new Date(futureDate.getTime() + 86400000), // 8日後
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
    assertEquals((sentMessage?.altText as string)?.includes('チケット一覧'), true);
  });

  it('should filter out tickets with past match dates', async () => {
    // テストデータ準備
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 昨日
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // 7日後

    const pastTicket = createTestTicket({
      id: 'past-ticket',
      matchName: '浦和レッズ vs 名古屋グランパス',
      matchDate: pastDate,
    });
    const futureTicket = createTestTicket({
      id: 'future-ticket',
      matchName: '浦和レッズ vs FC東京',
      matchDate: futureDate,
    });

    // モックの設定: 過去と未来のチケット両方を返す
    mockTicketRepository.mockFindByStatusIn([pastTicket, futureTicket]);

    // 実行
    await useCase.execute();

    // 検証: 未来のチケットのみが送信される
    assertEquals(mockLineClient.broadcastCallCount, 1);
    const sentMessage = mockLineClient.lastBroadcastMessage;
    assertEquals(sentMessage?.type, 'flex');
  });

  it('should not send message when all tickets have past match dates', async () => {
    // テストデータ準備（過去の試合日のみ）
    const pastDate1 = new Date();
    pastDate1.setDate(pastDate1.getDate() - 1); // 昨日
    const pastDate2 = new Date();
    pastDate2.setDate(pastDate2.getDate() - 7); // 7日前

    const pastTicket1 = createTestTicket({
      id: 'past-ticket-1',
      matchName: '浦和レッズ vs 名古屋グランパス',
      matchDate: pastDate1,
    });
    const pastTicket2 = createTestTicket({
      id: 'past-ticket-2',
      matchName: '浦和レッズ vs セレッソ大阪',
      matchDate: pastDate2,
    });

    // モックの設定: 過去のチケットのみを返す
    mockTicketRepository.mockFindByStatusIn([pastTicket1, pastTicket2]);

    // 実行
    await useCase.execute();

    // 検証: 過去のチケットのみの場合は送信しない
    assertEquals(mockLineClient.broadcastCallCount, 0);
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
    // モックの設定（未来の試合日）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    mockTicketRepository.mockFindByStatusIn([
      createTestTicket({
        id: 'ticket-1',
        matchName: '浦和レッズ vs FC東京',
        matchDate: futureDate,
      }),
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
