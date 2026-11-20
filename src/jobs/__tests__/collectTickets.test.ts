import { assert, assertEquals, assertRejects } from 'std/assert/mod.ts';
import { collectTickets, type CollectTicketsDeps } from '../collectTickets.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { Notification } from '@/domain/entities/Notification.ts';
import type { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';
import { AppError, DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';

type StubOptions = {
  collected?: Ticket[] | Error;
  existing?: Map<string, Ticket> | Error;
  upsertManyError?: Error;
};

function createDeps(options: StubOptions = {}) {
  const calls = {
    findByIds: [] as string[][],
    upsertMany: [] as Ticket[][],
    upsert: [] as Ticket[],
    findByTicketId: [] as string[],
    scheduleNotifications: [] as { ticket: Ticket; times: NotificationTiming[] }[],
    cancelNotifications: [] as string[][],
  };

  const deps: CollectTicketsDeps = {
    ticketCollectionService: {
      collectAllTickets: () =>
        options.collected instanceof Error
          ? Promise.reject(options.collected)
          : Promise.resolve(options.collected ?? []),
    },
    ticketRepository: {
      findByIds: (ids) => {
        calls.findByIds.push(ids);
        if (options.existing instanceof Error) return Promise.reject(options.existing);
        const map = new Map<string, Ticket>();
        for (const [id, ticket] of options.existing ?? []) {
          if (ids.includes(id)) map.set(id, ticket);
        }
        return Promise.resolve(map);
      },
      upsertMany: (tickets) => {
        calls.upsertMany.push(tickets);
        if (options.upsertManyError) return Promise.reject(options.upsertManyError);
        return Promise.resolve(tickets);
      },
      upsert: (ticket) => {
        calls.upsert.push(ticket);
        return Promise.resolve(ticket);
      },
    },
    notificationRepository: {
      findByTicketId: (ticketId) => {
        calls.findByTicketId.push(ticketId);
        return Promise.resolve<Notification[]>([]);
      },
      update: () => Promise.resolve(),
    },
    notificationSchedulerService: {
      scheduleNotifications: (ticket, times) => {
        calls.scheduleNotifications.push({ ticket, times });
        return Promise.resolve();
      },
      cancelNotifications: (taskIds) => {
        calls.cancelNotifications.push(taskIds);
        return Promise.resolve();
      },
    },
  };

  return { deps, calls };
}

Deno.test('collectTickets', async (t) => {
  await t.step('should execute successfully with mock tickets', async () => {
    const mockTicket = Ticket.fromExisting({
      id: 'test-ticket-1',
      matchName: 'Test Match',
      matchDate: new Date('2024-12-01'),
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
      competition: 'J1 League',
      venue: 'Test Stadium',
      ticketTypes: ['General', 'Premium'],
      ticketUrl: 'https://test.example.com/tickets/1',
      saleStartDate: new Date('2024-11-15'),
      saleEndDate: new Date('2024-12-01'),
      saleStatus: 'before_sale',
      createdAt: new Date(),
      updatedAt: new Date(),
      scrapedAt: new Date(),
      notificationScheduled: false,
    });

    const { deps, calls } = createDeps({ collected: [mockTicket] });
    const result = await collectTickets(deps);

    assertEquals(result.status, 'success');
    assertEquals(result.ticketsFound, 1);
    assertEquals(result.newTickets, 1);
    assertEquals(typeof result.executionDurationMs, 'number');

    assertEquals(calls.findByIds, [['test-ticket-1']]);
    assertEquals(calls.upsertMany.length, 1);
    assertEquals(calls.upsertMany[0].map((ticket) => ticket.id), ['test-ticket-1']);
    assertEquals(calls.scheduleNotifications.length, 0);
  });

  await t.step(
    'should preserve notificationScheduled state when updating existing tickets',
    async () => {
      const existingTicket = Ticket.fromExisting({
        id: 'test-ticket-preserve-notification',
        matchName: 'Test Match',
        matchDate: new Date('2024-12-01'),
        homeTeam: 'Home Team',
        awayTeam: 'Away Team',
        competition: 'J1 League',
        venue: 'Test Stadium',
        ticketTypes: ['General'],
        ticketUrl: 'https://test.example.com/tickets/1',
        saleStartDate: new Date('2024-11-15'),
        saleEndDate: new Date('2024-12-01'),
        saleStatus: 'before_sale',
        createdAt: new Date(),
        updatedAt: new Date(),
        scrapedAt: new Date(),
        notificationScheduled: true,
      });

      const scrapedTicket = await Ticket.createNew({
        matchName: 'Test Match',
        matchDate: new Date('2024-12-01'),
        homeTeam: 'Home Team',
        awayTeam: 'Away Team',
        competition: 'J1 League',
        venue: 'Test Stadium Updated',
        ticketTypes: ['General'],
        ticketUrl: 'https://test.example.com/tickets/1',
        saleStartDate: new Date('2024-11-15'),
        saleEndDate: new Date('2024-12-01'),
        saleStatus: 'before_sale',
        scrapedAt: new Date(),
        notificationScheduled: false,
      });

      const { deps, calls } = createDeps({
        collected: [scrapedTicket],
        existing: new Map([[scrapedTicket.id, existingTicket]]),
      });
      const result = await collectTickets(deps);

      assertEquals(result.status, 'success');
      assertEquals(result.updatedTickets, 1);

      assertEquals(calls.upsertMany.length, 1);
      const upsertedTickets = calls.upsertMany[0];
      assertEquals(upsertedTickets.length, 1);
      assertEquals(upsertedTickets[0]!.notificationScheduled, true);
      assertEquals(upsertedTickets[0]!.venue, 'Test Stadium Updated');
      assertEquals(upsertedTickets[0]!.id, existingTicket.id);
      assertEquals(calls.upsert.length, 0);
    },
  );

  await t.step(
    '新規の販売前チケットは通知をスケジュールし、notificationScheduled=true で保存し直す',
    async () => {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const ticket = await Ticket.createNew({
        matchName: 'Future Match',
        matchDate: new Date(now + 30 * day),
        homeTeam: null,
        awayTeam: null,
        competition: null,
        venue: null,
        ticketTypes: [],
        ticketUrl: null,
        saleStartDate: new Date(now + 10 * day),
        saleEndDate: null,
        saleStatus: 'before_sale',
        scrapedAt: new Date(),
        notificationScheduled: false,
      });

      const { deps, calls } = createDeps({ collected: [ticket] });
      const result = await collectTickets(deps);

      assertEquals(result.status, 'success');
      assertEquals(result.newTickets, 1);
      assertEquals(calls.scheduleNotifications.length, 1);
      assertEquals(calls.scheduleNotifications[0].ticket.id, ticket.id);
      assertEquals(
        calls.scheduleNotifications[0].times.map((timing) => timing.type).sort(),
        ['day_before', 'hour_before', 'minutes_before'],
      );
      assertEquals(calls.findByTicketId.length, 0);
      assertEquals(calls.cancelNotifications.length, 0);
      assertEquals(calls.upsert.length, 1);
      assertEquals(calls.upsert[0].id, ticket.id);
      assertEquals(calls.upsert[0].notificationScheduled, true);
    },
  );

  await t.step('upsertMany が失敗したら個別の upsert にフォールバックする', async () => {
    const ticket = Ticket.fromExisting({
      id: 'test-ticket-fallback',
      matchName: 'Test Match',
      matchDate: new Date('2024-12-01'),
      homeTeam: null,
      awayTeam: null,
      competition: null,
      venue: null,
      ticketTypes: [],
      ticketUrl: null,
      saleStartDate: null,
      saleEndDate: null,
      saleStatus: 'before_sale',
      createdAt: new Date(),
      updatedAt: new Date(),
      scrapedAt: new Date(),
      notificationScheduled: false,
    });

    const { deps, calls } = createDeps({
      collected: [ticket],
      upsertManyError: new Error('bulk failed'),
    });
    const result = await collectTickets(deps);

    assertEquals(result.status, 'success');
    assertEquals(result.newTickets, 1);
    assertEquals(calls.upsertMany.length, 1);
    assertEquals(calls.upsert.map((t) => t.id), ['test-ticket-fallback']);
  });

  await t.step('should handle collection service errors gracefully', async () => {
    const { deps } = createDeps({ collected: new Error('Mock collection error') });

    await assertRejects(
      () => collectTickets(deps),
      Error,
      'Mock collection error',
    );
  });
});

Deno.test('collectTickets - エラーの包み直し', async (t) => {
  const ticket = Ticket.fromExisting({
    id: 'test-ticket-error',
    matchName: 'Test Match',
    matchDate: new Date('2024-12-01'),
    homeTeam: null,
    awayTeam: null,
    competition: null,
    venue: null,
    ticketTypes: [],
    ticketUrl: null,
    saleStartDate: null,
    saleEndDate: null,
    saleStatus: 'before_sale',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    notificationScheduled: false,
  });

  await t.step('DatabaseError は TICKET_COLLECTION_FAILED で包み直す', async () => {
    const dbError = new DatabaseError(
      'TicketRepository',
      'findByIds',
      'connection refused',
      ErrorCodes.DB_FETCH_ERROR,
    );
    const { deps } = createDeps({ collected: [ticket], existing: dbError });

    const error = await assertRejects(() => collectTickets(deps), AppError);

    assertEquals(error.code, 'TICKET_COLLECTION_FAILED');
    assertEquals(
      error.message,
      '[TicketCollectionUseCase] Database operation failed: [TicketRepository.findByIds] connection refused',
    );
    assertEquals(error.cause, dbError);
    assertEquals(Object.keys(error.context ?? {}).sort(), ['executionDurationMs', 'sessionId']);
  });

  await t.step('その他のエラーは USECASE_EXECUTION_FAILED で包み直す', async () => {
    const { deps } = createDeps({ collected: new Error('Mock collection error') });

    const error = await assertRejects(() => collectTickets(deps), AppError);

    assertEquals(error.code, 'USECASE_EXECUTION_FAILED');
    assertEquals(
      error.message,
      '[TicketCollectionUseCase] Ticket collection failed: Mock collection error',
    );
    assert(error.cause instanceof Error);
    assertEquals(error.cause?.message, 'Mock collection error');
    assertEquals(Object.keys(error.context ?? {}).sort(), ['executionDurationMs', 'sessionId']);
  });
});

Deno.test('collectTickets - 集計とエラーの握りつぶし', async (t) => {
  const day = 24 * 60 * 60 * 1000;
  const futureTicket = () =>
    Ticket.createNew({
      matchName: 'Future Match',
      matchDate: new Date(Date.now() + 30 * day),
      homeTeam: null,
      awayTeam: null,
      competition: null,
      venue: null,
      ticketTypes: [],
      ticketUrl: null,
      saleStartDate: new Date(Date.now() + 10 * day),
      saleEndDate: null,
      saleStatus: 'before_sale',
      scrapedAt: new Date(),
      notificationScheduled: false,
    });

  await t.step('通知のスケジュールが失敗しても成功として結果を返す', async () => {
    const ticket = await futureTicket();
    const { deps, calls } = createDeps({ collected: [ticket] });
    deps.notificationSchedulerService.scheduleNotifications = () =>
      Promise.reject(new Error('Cloud Tasks down'));

    const result = await collectTickets(deps);

    assertEquals(result.status, 'success');
    assertEquals(result.newTickets, 1);
    assertEquals(calls.upsert.length, 0);
  });

  await t.step('変更のない既存チケットは unchanged として数え、upsert しない', async () => {
    const ticket = await futureTicket();
    const { deps, calls } = createDeps({
      collected: [ticket],
      existing: new Map([[ticket.id, ticket]]),
    });

    const result = await collectTickets(deps);

    assertEquals(result.ticketsFound, 1);
    assertEquals(result.newTickets, 0);
    assertEquals(result.updatedTickets, 0);
    assertEquals(result.unchangedTickets, 1);
    assertEquals(result.failedTickets, 0);
    assertEquals(calls.upsertMany.length, 0);
    assertEquals(calls.scheduleNotifications.length, 0);
  });

  await t.step(
    '一括 upsert の後の個別 upsert が失敗したチケットは failed として数える',
    async () => {
      const ticket = await futureTicket();
      const { deps, calls } = createDeps({
        collected: [ticket],
        upsertManyError: new Error('bulk failed'),
      });
      deps.ticketRepository.upsert = (failed) => {
        calls.upsert.push(failed);
        return Promise.reject(new Error('single failed'));
      };

      const result = await collectTickets(deps);

      assertEquals(result.status, 'success');
      assertEquals(result.newTickets, 0);
      assertEquals(result.failedTickets, 1);
      assertEquals(calls.scheduleNotifications.length, 0);
    },
  );
});

async function captureLogs(fn: () => Promise<unknown>): Promise<Record<string, unknown>[]> {
  const lines: string[] = [];
  const originalLog = console.log;
  const envKeys = ['NODE_ENV', 'K_SERVICE', 'K_REVISION'];
  const originalEnv = envKeys.map((key) => [key, Deno.env.get(key)] as const);
  console.log = (line: string) => lines.push(line);
  Deno.env.set('NODE_ENV', 'production');
  Deno.env.delete('K_SERVICE');
  Deno.env.delete('K_REVISION');
  try {
    await fn();
  } finally {
    console.log = originalLog;
    for (const [key, value] of originalEnv) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
  return lines.map((line) => JSON.parse(line));
}

Deno.test('collectTickets - ログ', async (t) => {
  const pastTicket = Ticket.fromExisting({
    id: 'log-ticket-1',
    matchName: 'Log Match',
    matchDate: new Date('2024-12-01T10:00:00Z'),
    homeTeam: null,
    awayTeam: null,
    competition: null,
    venue: null,
    ticketTypes: [],
    ticketUrl: null,
    saleStartDate: null,
    saleEndDate: null,
    saleStatus: 'before_sale',
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    notificationScheduled: false,
  });

  await t.step('新規チケットの INFO と集計の INFO を出す', async () => {
    const { deps } = createDeps({ collected: [pastTicket] });

    const logs = await captureLogs(() => collectTickets(deps));

    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['INFO', 'Ticket created: Log Match'],
      ['INFO', 'Ticket collection completed: 1 new, 0 updated, 0 unchanged, 0 failed'],
    ]);
    assertEquals(logs[0].jsonPayload, {
      category: 'TICKET_COLLECTION',
      context: { ticketId: 'log-ticket-1', matchName: 'Log Match', stage: 'upsert' },
      data: {
        updated: {
          id: 'log-ticket-1',
          matchName: 'Log Match',
          saleStatus: 'before_sale',
          ticketTypes: [],
        },
      },
      metadata: { operation: 'created', hasChanges: true },
    });
    const summary = logs[1].jsonPayload as {
      category: string;
      metrics: Record<string, number>;
      context: Record<string, string>;
    };
    assertEquals(summary.category, 'TICKET_COLLECTION');
    assertEquals(Object.keys(summary.context), ['sessionId']);
    assertEquals(
      Object.keys(summary.metrics),
      [
        'totalProcessed',
        'successCount',
        'failureCount',
        'unknownPatterns',
        'processingTimeMs',
        'successRate',
      ],
    );
    assertEquals(summary.metrics.totalProcessed, 1);
    assertEquals(summary.metrics.successCount, 1);
    assertEquals(summary.metrics.failureCount, 0);
    assertEquals(summary.metrics.successRate, 1);
  });

  await t.step('一括 upsert の失敗は WARNING を出してフォールバックする', async () => {
    const { deps } = createDeps({
      collected: [pastTicket],
      upsertManyError: new Error('bulk failed'),
    });

    const logs = await captureLogs(() => collectTickets(deps));

    assertEquals(logs[0], {
      severity: 'WARNING',
      message: 'Bulk upsert failed, falling back to individual upserts',
      jsonPayload: {
        category: 'TICKET_COLLECTION',
        error: { message: 'bulk failed', recoverable: true },
        metadata: { ticketCount: 1, fallbackReason: 'bulk_upsert_failed' },
      },
    });
  });
});
