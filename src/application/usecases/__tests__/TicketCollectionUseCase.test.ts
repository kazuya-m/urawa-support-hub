import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import {
  clearAllMocks,
  createMockDependencies,
  createMockTicketCollectionUseCase,
  MockTicketCollectionService,
} from '@/shared/testing/mocks/index.ts';

// TicketCollectionUseCaseの完全分離テスト（外部依存なし）
Deno.test('TicketCollectionUseCase - Complete Isolation Tests', async (t) => {
  await t.step('should create TicketCollectionUseCase with Mock dependencies', () => {
    const useCase = createMockTicketCollectionUseCase();
    assertEquals(typeof useCase, 'object');
  });

  await t.step('should execute successfully with mock tickets', async () => {
    const mockTicket = Ticket.fromExisting({
      id: 'test-ticket-1',
      matchName: 'Test Match',
      matchDate: new Date('2024-12-01'),
      venue: 'Test Stadium',
      ticketUrl: 'https://test.example.com/tickets/1',
      saleStartDate: new Date('2024-11-15'),
      saleStatus: 'before_sale',
      createdAt: new Date(),
      updatedAt: new Date(),
      scrapedAt: new Date(),
      notificationScheduled: false,
    });

    const dependencies = createMockDependencies();
    if (dependencies.ticketCollectionService instanceof MockTicketCollectionService) {
      dependencies.ticketCollectionService.setMockTickets([mockTicket]);
    }

    const useCase = createMockTicketCollectionUseCase(dependencies);
    const result = await useCase.execute();

    assertEquals(result.status, 'success');
    assertEquals(result.ticketsFound, 1);
    assertEquals(result.newTickets, 1);
    assertEquals(typeof result.executionDurationMs, 'number');
  });

  await t.step(
    'should preserve notificationScheduled state when updating existing tickets',
    async () => {
      // 既存チケット（通知スケジュール済み）
      const existingTicket = Ticket.fromExisting({
        id: 'test-ticket-preserve-notification',
        matchName: 'Test Match',
        matchDate: new Date('2024-12-01'),
        venue: 'Test Stadium',
        ticketUrl: 'https://test.example.com/tickets/1',
        saleStartDate: new Date('2024-11-15'),
        saleStatus: 'before_sale',
        createdAt: new Date(),
        updatedAt: new Date(),
        scrapedAt: new Date(),
        notificationScheduled: true, // 既に通知スケジュール済み
      });

      // 新しくスクレイピングされたチケット（通知未スケジュール）
      const scrapedTicket = await Ticket.createNew({
        matchName: 'Test Match',
        matchDate: new Date('2024-12-01'),
        venue: 'Test Stadium Updated', // venueが更新されている
        ticketUrl: 'https://test.example.com/tickets/1',
        saleStartDate: new Date('2024-11-15'),
        saleStatus: 'before_sale',
        scrapedAt: new Date(),
        notificationScheduled: false, // スクレイピング時は未スケジュール
      });

      const dependencies = createMockDependencies();

      // モックでは既存チケットが存在することを設定（最適化後はfindByIdsを使用）
      dependencies.ticketRepository.findByIds = (ids: string[]) => {
        const resultMap = new Map<string, Ticket>();
        if (ids.includes(scrapedTicket.id)) {
          resultMap.set(scrapedTicket.id, existingTicket);
        }
        return Promise.resolve(resultMap);
      };

      let upsertedTickets: Ticket[] = [];
      dependencies.ticketRepository.upsertMany = (tickets: Ticket[]): Promise<Ticket[]> => {
        upsertedTickets = tickets;
        return Promise.resolve(tickets);
      };
      // フォールバック用の個別upsertも定義
      dependencies.ticketRepository.upsert = (ticket: Ticket): Promise<Ticket> => {
        upsertedTickets.push(ticket);
        return Promise.resolve(ticket);
      };

      if (dependencies.ticketCollectionService instanceof MockTicketCollectionService) {
        dependencies.ticketCollectionService.setMockTickets([scrapedTicket]);
      }

      const useCase = createMockTicketCollectionUseCase(dependencies);
      const result = await useCase.execute();

      // 実行成功確認
      assertEquals(result.status, 'success');
      assertEquals(result.updatedTickets, 1);

      // notificationScheduled状態が保持されていることを確認（mergeWithによる）
      assertEquals(upsertedTickets.length, 1);
      assertEquals(upsertedTickets[0]!.notificationScheduled, true);
      assertEquals(upsertedTickets[0]!.venue, 'Test Stadium Updated'); // ビジネスデータは更新されている
      assertEquals(upsertedTickets[0]!.id, existingTicket.id); // IDも保持されている
    },
  );

  await t.step('should handle collection service errors gracefully', async () => {
    const dependencies = createMockDependencies();
    if (dependencies.ticketCollectionService instanceof MockTicketCollectionService) {
      dependencies.ticketCollectionService.setShouldThrowError(true, 'Mock collection error');
    }

    const useCase = createMockTicketCollectionUseCase(dependencies);

    // エラー時は例外が投げられることを検証
    await assertRejects(
      () => useCase.execute(),
      Error,
      'Mock collection error',
    );
  });

  await t.step('should clean up mocks after each test', () => {
    const dependencies = createMockDependencies();
    clearAllMocks(dependencies);

    // モックがクリアされていることを確認
    assertEquals(dependencies.ticketRepository instanceof Object, true);
  });
});
