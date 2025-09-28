import { assertEquals } from 'std/assert/mod.ts';
import { afterEach, beforeEach, describe, it } from 'std/testing/bdd.ts';
import { SendTicketSummaryUseCase } from '../SendTicketSummaryUseCase.ts';
import { MockTicketRepository } from '@/shared/testing/mocks/MockTicketRepository.ts';
import { MockNotificationService } from '@/shared/testing/mocks/MockNotificationService.ts';
import { createTestTicket } from '@/shared/testing/TestDataGenerator.ts';

describe('SendTicketSummaryUseCase', () => {
  let useCase: SendTicketSummaryUseCase;
  let mockTicketRepository: MockTicketRepository;
  let mockNotificationService: MockNotificationService;

  beforeEach(() => {
    mockTicketRepository = new MockTicketRepository();
    mockNotificationService = new MockNotificationService();
    useCase = new SendTicketSummaryUseCase(mockTicketRepository, mockNotificationService);
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    mockTicketRepository.resetMocks();
    mockNotificationService.clear();
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

    assertEquals(mockNotificationService.getSendTicketSummaryCallCount(), 1);

    const sentTickets = mockNotificationService.getLastSentTickets();
    assertEquals(sentTickets?.length, 2);
    assertEquals(sentTickets?.[0].id, 'ticket-1');
    assertEquals(sentTickets?.[1].id, 'ticket-2');
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
    assertEquals(mockNotificationService.getSendTicketSummaryCallCount(), 1);
    const sentTickets = mockNotificationService.getLastSentTickets();
    assertEquals(sentTickets?.length, 1);
    assertEquals(sentTickets?.[0].id, 'future-ticket');
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
    assertEquals(mockNotificationService.getSendTicketSummaryCallCount(), 0);
  });

  it('should not send message when no tickets exist', async () => {
    // モックの設定: 空の配列を返す
    mockTicketRepository.mockFindByStatusIn([]);

    // 実行
    await useCase.execute();

    // 検証: チケットが0件の場合は送信しない
    assertEquals(mockNotificationService.getSendTicketSummaryCallCount(), 0);
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
    assertEquals(thrownError?.message, 'Ticket summary notification failed: Database error');
    assertEquals(mockNotificationService.getSendTicketSummaryCallCount(), 0);
  });

  it('should handle notification service errors', async () => {
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
    mockNotificationService.setShouldThrowError(true, 'Notification service error');

    // 実行
    let thrownError: Error | undefined;
    try {
      await useCase.execute();
    } catch (error) {
      thrownError = error as Error;
    }

    // 検証
    assertEquals(
      thrownError?.message,
      'Ticket summary notification failed: Notification service error',
    );
    assertEquals(mockNotificationService.getSendTicketSummaryCallCount(), 1);
  });
});
