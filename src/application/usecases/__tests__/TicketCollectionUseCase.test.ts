import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { TicketCollectionUseCase } from '../TicketCollectionUseCase.ts';
import { HealthCheckResult, SystemHealth } from '@/domain/entities/SystemHealth.ts';
import { ScrapedTicketData } from '@/domain/entities/Ticket.ts';

// Mock scraping service interface for testing (avoids Playwright dependencies)
interface MockScrapingService {
  scrapeAwayTickets(): Promise<ScrapedTicketData[]>;
}

class TestMockScrapingService implements MockScrapingService {
  private mockTickets: ScrapedTicketData[] = [];
  private shouldThrow: boolean = false;

  constructor(mockTickets: ScrapedTicketData[] = [], shouldThrow: boolean = false) {
    this.mockTickets = mockTickets;
    this.shouldThrow = shouldThrow;
  }

  async scrapeAwayTickets() {
    if (this.shouldThrow) {
      throw new Error('Scraping failed');
    }
    await Promise.resolve(); // Add await to satisfy lint rule
    return this.mockTickets;
  }
}

class MockHealthRepository {
  private records: SystemHealth[] = [];
  private shouldThrow: boolean = false;

  constructor(shouldThrow: boolean = false) {
    this.shouldThrow = shouldThrow;
  }

  async recordDailyExecution(result: HealthCheckResult): Promise<void> {
    if (this.shouldThrow) {
      throw new Error('Health recording failed');
    }
    const health = SystemHealth.createFromHealthCheck(result);
    this.records.push(health);
    await Promise.resolve(); // Add await to satisfy lint rule
  }

  // Test helper methods
  getRecords(): SystemHealth[] {
    return this.records;
  }

  clearRecords(): void {
    this.records = [];
  }
}

Deno.test('TicketCollectionUseCase Tests', async (t) => {
  await t.step('should execute daily scraping successfully and record health', async () => {
    const mockTickets: ScrapedTicketData[] = [];

    const scrapingService = new TestMockScrapingService(mockTickets, false);
    const healthRepository = new MockHealthRepository(false);

    const ticketCollectionUseCase = new TicketCollectionUseCase(
      // deno-lint-ignore no-explicit-any
      scrapingService as any,
      // deno-lint-ignore no-explicit-any
      healthRepository as any,
    );

    await ticketCollectionUseCase.execute();

    const records = healthRepository.getRecords();
    assertEquals(records.length, 1);

    const record = records[0];
    assertEquals(record.status, 'success');
    assertEquals(record.ticketsFound, 0);
    assertEquals(typeof record.executionDurationMs, 'number');
  });

  await t.step('should record health even when scraping finds tickets', async () => {
    const mockTickets: ScrapedTicketData[] = [
      {
        matchName: 'Test Match',
        matchDate: '2024-03-15',
        saleDate: '2024-03-01',
        ticketTypes: ['away'],
        venue: 'Test Stadium',
        ticketUrl: 'https://example.com/ticket',
      },
    ];

    const scrapingService = new TestMockScrapingService(mockTickets, false);
    const healthRepository = new MockHealthRepository(false);

    const ticketCollectionUseCase = new TicketCollectionUseCase(
      // deno-lint-ignore no-explicit-any
      scrapingService as any,
      // deno-lint-ignore no-explicit-any
      healthRepository as any,
    );

    await ticketCollectionUseCase.execute();

    const records = healthRepository.getRecords();
    assertEquals(records.length, 1);

    const record = records[0];
    assertEquals(record.status, 'success');
    assertEquals(record.ticketsFound, 1);
  });

  await t.step('should handle scraping errors and record failure health', async () => {
    const scrapingService = new TestMockScrapingService([], true);
    const healthRepository = new MockHealthRepository(false);

    const ticketCollectionUseCase = new TicketCollectionUseCase(
      // deno-lint-ignore no-explicit-any
      scrapingService as any,
      // deno-lint-ignore no-explicit-any
      healthRepository as any,
    );

    // エラーがスローされることを期待
    await assertRejects(
      async () => await ticketCollectionUseCase.execute(),
      Error,
      'Scraping failed',
    );

    const records = healthRepository.getRecords();
    assertEquals(records.length, 1);

    const record = records[0];
    assertEquals(record.status, 'error');
    assertEquals(record.ticketsFound, 0);
    assertEquals(typeof record.executionDurationMs, 'number');
    assertEquals(typeof record.errorDetails?.message, 'string');
  });

  await t.step('should handle health recording errors gracefully', async () => {
    const scrapingService = new TestMockScrapingService([], false);
    const healthRepository = new MockHealthRepository(true);

    const ticketCollectionUseCase = new TicketCollectionUseCase(
      // deno-lint-ignore no-explicit-any
      scrapingService as any,
      // deno-lint-ignore no-explicit-any
      healthRepository as any,
    );

    // Should throw error from health recording
    await assertRejects(
      () => ticketCollectionUseCase.execute(),
      Error,
      'Health recording failed',
    );
  });
});
