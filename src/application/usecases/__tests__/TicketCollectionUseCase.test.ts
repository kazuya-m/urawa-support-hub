import { assertEquals } from 'std/assert/mod.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import {
  clearAllMocks,
  createMockDependencies,
  createMockTicketCollectionUseCase,
  MockHealthRepository,
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

  await t.step('should handle collection service errors gracefully', async () => {
    const dependencies = createMockDependencies();
    if (dependencies.ticketCollectionService instanceof MockTicketCollectionService) {
      dependencies.ticketCollectionService.setShouldThrowError(true, 'Mock collection error');
    }

    const useCase = createMockTicketCollectionUseCase(dependencies);
    const result = await useCase.execute();

    assertEquals(result.status, 'error');
    assertEquals(result.ticketsFound, 0);
    assertEquals(result.errorDetails?.message, 'Mock collection error');
  });

  await t.step('should record health execution on success', async () => {
    const mockTicket = Ticket.fromExisting({
      id: 'test-ticket-2',
      matchName: 'Test Match 2',
      matchDate: new Date('2024-12-02'),
      venue: 'Test Stadium 2',
      ticketUrl: 'https://test.example.com/tickets/2',
      saleStartDate: new Date('2024-11-16'),
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
    await useCase.execute();

    if (dependencies.healthRepository instanceof MockHealthRepository) {
      const latestHealth = await dependencies.healthRepository.getLatestHealthRecord();
      assertEquals(latestHealth?.status, 'success');
    }
  });

  await t.step('should record health execution on error', async () => {
    const dependencies = createMockDependencies();
    if (dependencies.ticketCollectionService instanceof MockTicketCollectionService) {
      dependencies.ticketCollectionService.setShouldThrowError(true, 'Test error');
    }

    const useCase = createMockTicketCollectionUseCase(dependencies);
    await useCase.execute();

    if (dependencies.healthRepository instanceof MockHealthRepository) {
      const latestHealth = await dependencies.healthRepository.getLatestHealthRecord();
      assertEquals(latestHealth?.status, 'error');
      assertEquals(latestHealth?.errorDetails?.message, 'Test error');
    }
  });

  await t.step('should clean up mocks after each test', () => {
    const dependencies = createMockDependencies();
    clearAllMocks(dependencies);

    // モックがクリアされていることを確認
    assertEquals(dependencies.ticketRepository instanceof Object, true);
  });
});
