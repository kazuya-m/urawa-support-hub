import { assertEquals } from 'std/assert/mod.ts';
import {
  handleCollectTickets,
  TICKET_COLLECTION_ERROR_OPTIONS,
} from '../collectTicketsController.ts';
import { withErrorHandling } from '../http.ts';
import { DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';
import type { CollectTicketsDeps } from '@/usecases/collectTickets.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { Notification } from '@/domain/entities/Notification.ts';

type LogEntry = {
  severity: string;
  message: string;
  jsonPayload?: Record<string, unknown>;
};

async function captureLogs<T>(fn: () => Promise<T>): Promise<{ result: T; logs: LogEntry[] }> {
  const lines: string[] = [];
  const originalLog = console.log;
  const originalNodeEnv = Deno.env.get('NODE_ENV');
  console.log = (line: string) => lines.push(line);
  Deno.env.set('NODE_ENV', 'production');
  try {
    const result = await fn();
    return { result, logs: lines.map((line) => JSON.parse(line) as LogEntry) };
  } finally {
    console.log = originalLog;
    if (originalNodeEnv === undefined) Deno.env.delete('NODE_ENV');
    else Deno.env.set('NODE_ENV', originalNodeEnv);
  }
}

const collectDeps = (
  options: { collected?: Ticket[]; error?: Error } = {},
): CollectTicketsDeps => ({
  ticketCollectionService: {
    collectAllTickets: () =>
      options.error ? Promise.reject(options.error) : Promise.resolve(options.collected ?? []),
  },
  ticketRepository: {
    findByIds: () => Promise.resolve(new Map<string, Ticket>()),
    upsertMany: (tickets) => Promise.resolve(tickets),
    upsert: (ticket) => Promise.resolve(ticket),
  },
  notificationRepository: {
    findByTicketId: () => Promise.resolve<Notification[]>([]),
    update: () => Promise.resolve(),
  },
  notificationSchedulerService: {
    scheduleNotifications: () => Promise.resolve(),
    cancelNotifications: () => Promise.resolve(),
  },
});

Deno.test('collect-tickets: 成功時は 200 と件数', async () => {
  const ticket = Ticket.fromExisting({
    id: 'collected-1',
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
  const { result: response } = await captureLogs(() =>
    handleCollectTickets(collectDeps({ collected: [ticket] }))
  );
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(Object.keys(body), [
    'status',
    'message',
    'ticketsFound',
    'newTickets',
    'updatedTickets',
    'executionTimeMs',
    'timestamp',
  ]);
  assertEquals(body.status, 'success');
  assertEquals(body.message, 'Ticket collection completed successfully');
  assertEquals(body.ticketsFound, 1);
  assertEquals(body.newTickets, 1);
  assertEquals(body.updatedTickets, 0);
});

Deno.test('collect-tickets: 収集の失敗は AppError（USECASE_EXECUTION_FAILED）として 500', async () => {
  const { result: response, logs } = await captureLogs(() =>
    handleCollectTickets(collectDeps({ error: new Error('boom') }))
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(
    body.error,
    '[USECASE_EXECUTION_FAILED] [TicketCollectionUseCase] Ticket collection failed: boom',
  );
  assertEquals(Object.keys(body.details).sort(), ['executionDurationMs', 'sessionId']);

  assertEquals(logs.length, 2);
  assertEquals(logs[0].severity, 'ERROR');
  assertEquals(logs[0].message, 'Ticket collection failed');
  assertEquals(logs[1].severity, 'ERROR');
  assertEquals(logs[1].message, 'UseCase error in ticket collection');
  assertEquals(logs[1].jsonPayload, {
    category: 'TICKET_COLLECTION',
    error: {
      details: '[TicketCollectionUseCase] Ticket collection failed: boom',
      recoverable: true,
    },
  });
});

Deno.test('collect-tickets: DatabaseError は TICKET_COLLECTION_FAILED として 500', async () => {
  const deps = collectDeps({ collected: [] });
  deps.ticketCollectionService.collectAllTickets = () =>
    Promise.reject(
      new DatabaseError('TicketRepository', 'findByIds', 'down', ErrorCodes.DB_FETCH_ERROR),
    );
  const { result: response, logs } = await captureLogs(() => handleCollectTickets(deps));
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(
    body.error,
    '[TICKET_COLLECTION_FAILED] [TicketCollectionUseCase] Database operation failed: [TicketRepository.findByIds] down',
  );
  assertEquals(logs.map((log) => [log.severity, log.message]), [
    ['ERROR', 'Ticket collection service error'],
    ['ERROR', 'UseCase error in ticket collection'],
  ]);
});

Deno.test('collect-tickets: 想定外エラーの応答', async () => {
  const { result: response } = await captureLogs(() =>
    withErrorHandling(
      () => Promise.reject(new Error('unexpected')),
      TICKET_COLLECTION_ERROR_OPTIONS,
    )
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Ticket collection failed');
  assertEquals(body.details, 'unexpected');
});
