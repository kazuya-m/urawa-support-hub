import { assertEquals } from 'std/assert/mod.ts';
import { beforeEach, describe, it } from 'std/testing/bdd.ts';
import { SendTicketSummaryUseCase } from '../SendTicketSummaryUseCase.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import type { NotificationService } from '@/infrastructure/services/notification/NotificationService.ts';

/**
 * テスト用のチケットを作る（指定しない項目は固定値）
 */
function createTestTicket(
  overrides: { id: string; matchName: string; matchDate: Date },
): Ticket {
  return Ticket.fromExisting({
    homeTeam: '浦和レッズ',
    awayTeam: 'FC東京',
    competition: 'J1リーグ',
    venue: 'さいたまスタジアム2002',
    saleStartDate: new Date('2025-09-25T10:00:00+09:00'),
    saleEndDate: new Date('2025-10-01T12:00:00+09:00'),
    saleStatus: 'on_sale',
    ticketTypes: ['一般', 'ホームゲート指定席'],
    ticketUrl: 'https://example.com/tickets/test-ticket-1',
    notificationScheduled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    ...overrides,
  });
}

describe('SendTicketSummaryUseCase', () => {
  let useCase: SendTicketSummaryUseCase;
  /** findByStatusIn が返すチケット。Error を設定すると reject する */
  let findByStatusInResult: Ticket[] | Error;
  let findByStatusInCalls: string[][];
  /** sendTicketSummary を失敗させるエラー */
  let sendError: Error | null;
  let sentSummaries: Ticket[][];

  beforeEach(() => {
    findByStatusInResult = [];
    findByStatusInCalls = [];
    sendError = null;
    sentSummaries = [];

    const ticketRepository = {
      findByStatusIn: (statuses: string[]) => {
        findByStatusInCalls.push(statuses);
        return findByStatusInResult instanceof Error
          ? Promise.reject(findByStatusInResult)
          : Promise.resolve(findByStatusInResult);
      },
    } satisfies Partial<TicketRepository>;

    const notificationService = {
      sendTicketSummary: (tickets: Ticket[]) => {
        sentSummaries.push(tickets);
        return sendError ? Promise.reject(sendError) : Promise.resolve();
      },
    } satisfies Partial<NotificationService>;

    useCase = new SendTicketSummaryUseCase(
      ticketRepository as unknown as TicketRepository,
      notificationService as unknown as NotificationService,
    );
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
    findByStatusInResult = [ticket1, ticket2];

    // 実行
    await useCase.execute();

    // 検証
    assertEquals(findByStatusInCalls.length, 1);
    assertEquals(findByStatusInCalls[0], ['on_sale', 'before_sale']);

    assertEquals(sentSummaries.length, 1);

    const sentTickets = sentSummaries.at(-1);
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
    findByStatusInResult = [pastTicket, futureTicket];

    // 実行
    await useCase.execute();

    // 検証: 未来のチケットのみが送信される
    assertEquals(sentSummaries.length, 1);
    const sentTickets = sentSummaries.at(-1);
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
    findByStatusInResult = [pastTicket1, pastTicket2];

    // 実行
    await useCase.execute();

    // 検証: 過去のチケットのみの場合は送信しない
    assertEquals(sentSummaries.length, 0);
  });

  it('should not send message when no tickets exist', async () => {
    // モックの設定: 空の配列を返す
    findByStatusInResult = [];

    // 実行
    await useCase.execute();

    // 検証: チケットが0件の場合は送信しない
    assertEquals(sentSummaries.length, 0);
  });

  it('should handle repository errors', async () => {
    // モックの設定: エラーを投げる
    findByStatusInResult = new Error('Database error');

    // 実行
    let thrownError: Error | undefined;
    try {
      await useCase.execute();
    } catch (error) {
      thrownError = error as Error;
    }

    // 検証
    assertEquals(thrownError?.message, 'Ticket summary notification failed: Database error');
    assertEquals(sentSummaries.length, 0);
  });

  it('should handle notification service errors', async () => {
    // モックの設定（未来の試合日）
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    findByStatusInResult = [
      createTestTicket({
        id: 'ticket-1',
        matchName: '浦和レッズ vs FC東京',
        matchDate: futureDate,
      }),
    ];
    sendError = new Error('Notification service error');

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
    assertEquals(sentSummaries.length, 1);
  });
});
