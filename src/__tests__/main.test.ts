import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import {
  type ErrorHandlingOptions,
  handleRequest,
  type RouteFactories,
  TICKET_COLLECTION_ERROR_OPTIONS,
  withErrorHandling,
} from '../main.ts';
import { DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import type { CollectTicketsDeps } from '@/jobs/collectTickets.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { SendSummaryDeps } from '@/jobs/sendSummary.ts';
import type { SendNotificationDeps } from '@/jobs/sendNotification.ts';
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

const post = (path: string, body?: string) =>
  new Request(`http://localhost:8080${path}`, { method: 'POST', body });

const unusedFactories: RouteFactories = {
  collectTickets: () => {
    throw new Error('collectTickets should not be created');
  },
  sendNotification: () => {
    throw new Error('sendNotification should not be created');
  },
  ticketSummary: () => {
    throw new Error('ticketSummary should not be created');
  },
};

const factoriesWith = (overrides: Partial<RouteFactories>): RouteFactories => ({
  ...unusedFactories,
  ...overrides,
});

/**
 * collectTickets の依存のスタブ（収集結果か収集のエラーを指定する）
 */
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

const respondCollect = (deps: CollectTicketsDeps) =>
  handleRequest(
    post('/api/collect-tickets'),
    factoriesWith({ collectTickets: () => Promise.resolve(deps) }),
  );

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
    respondCollect(collectDeps({ collected: [ticket] }))
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
    respondCollect(collectDeps({ error: new Error('boom') }))
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(
    body.error,
    '[USECASE_EXECUTION_FAILED] [TicketCollectionUseCase] Ticket collection failed: boom',
  );
  assertEquals(Object.keys(body.details).sort(), ['executionDurationMs', 'sessionId']);

  // job の 1 件の後に、共通エラーハンドラの 1 件
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
  const { result: response, logs } = await captureLogs(() => respondCollect(deps));
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

Deno.test('withErrorHandling - 汎用の挙動', async (t) => {
  const options: ErrorHandlingOptions = {
    logMessage: 'test error',
    category: LogCategory.SYSTEM,
    context: { stage: 'test' },
    unexpectedResponse: (errorMessage) => ['Unexpected', { errorMessage }],
  };

  await t.step('正常時はハンドラの応答をそのまま返す', async () => {
    const ok = new Response('ok', { status: 201 });
    const { result, logs } = await captureLogs(() =>
      withErrorHandling(() => Promise.resolve(ok), options)
    );
    assertEquals(result, ok);
    assertEquals(logs.length, 0);
  });

  await t.step('DatabaseError は AppError として扱い、context をログに付ける', async () => {
    const { result: response, logs } = await captureLogs(() =>
      withErrorHandling(
        () => Promise.reject(new DatabaseError('Repo', 'op', 'x', ErrorCodes.DB_FETCH_ERROR)),
        options,
      )
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, '[DB_FETCH_ERROR] [Repo.op] x');
    assertEquals(body.details, { type: 'DATABASE' });
    assertEquals(logs[0].severity, 'ERROR');
    assertEquals(logs[0].jsonPayload, {
      category: 'SYSTEM',
      context: { stage: 'test' },
      error: { details: '[Repo.op] x', recoverable: true },
    });
  });

  await t.step('severity を省略した想定外エラーは ERROR で記録する', async () => {
    const { result: response, logs } = await captureLogs(() =>
      withErrorHandling(() => Promise.reject(new Error('boom')), options)
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Unexpected');
    assertEquals(body.details, { errorMessage: 'boom' });
    assertEquals(logs[0].severity, 'ERROR');
  });
});

Deno.test('handleRequest - ルーティング', async (t) => {
  await t.step('未知のパスは 404', async () => {
    const response = await handleRequest(
      new Request('http://localhost:8080/api/unknown', { method: 'GET' }),
      unusedFactories,
    );
    const body = await response.json();

    assertEquals(response.status, 404);
    assertEquals(body.error, 'Not Found');
    assertEquals(body.message, 'GET /api/unknown is not supported');
  });

  await t.step('メソッドが違えば 404', async () => {
    const response = await handleRequest(
      new Request('http://localhost:8080/api/collect-tickets', { method: 'GET' }),
      unusedFactories,
    );

    assertEquals(response.status, 404);
    await response.body?.cancel();
  });

  await t.step('/health は handleHealthCheck の応答を返す', async () => {
    const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const original = keys.map((key) => [key, Deno.env.get(key)] as const);
    for (const key of keys) Deno.env.set(key, 'x');
    try {
      const response = await handleRequest(
        new Request('http://localhost:8080/health', { method: 'GET' }),
        unusedFactories,
      );
      const body = await response.json();

      assertEquals(response.status, 200);
      assertEquals(body.status, 'healthy');
    } finally {
      for (const [key, value] of original) {
        if (value === undefined) Deno.env.delete(key);
        else Deno.env.set(key, value);
      }
    }
  });

  await t.step('依存の生成で投げた例外は withErrorHandling で包まずにそのまま投げる', async () => {
    for (const path of ['/api/collect-tickets', '/api/send-notification', '/api/ticket-summary']) {
      await assertRejects(
        () => handleRequest(post(path), unusedFactories),
        Error,
        'should not be created',
      );
    }
  });
});

Deno.test('ticket-summary', async (t) => {
  const upcoming = Ticket.fromExisting({
    id: 'ticket-1',
    matchName: '浦和レッズ vs FC東京',
    matchDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    homeTeam: null,
    awayTeam: null,
    competition: null,
    venue: null,
    saleStartDate: null,
    saleEndDate: null,
    saleStatus: 'on_sale',
    ticketTypes: [],
    ticketUrl: null,
    notificationScheduled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
  });

  const summaryDeps = (
    options: { findError?: Error; broadcastError?: Error } = {},
  ): SendSummaryDeps => ({
    ticketRepository: {
      findByStatusIn: () =>
        options.findError ? Promise.reject(options.findError) : Promise.resolve([upcoming]),
    },
    lineClient: {
      broadcast: () =>
        options.broadcastError ? Promise.reject(options.broadcastError) : Promise.resolve(),
    },
  });

  await t.step('成功時は 200', async () => {
    const { result: response } = await captureLogs(() =>
      handleRequest(
        post('/api/ticket-summary'),
        factoriesWith({ ticketSummary: () => summaryDeps() }),
      )
    );
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(Object.keys(body), ['status', 'message', 'timestamp']);
    assertEquals(body.status, 'success');
    assertEquals(body.message, 'Ticket summary processed successfully');
  });

  await t.step('LINE の失敗は想定外エラーとして 500（メッセージは 2 重に包まれる）', async () => {
    const { result: response, logs } = await captureLogs(() =>
      handleRequest(
        post('/api/ticket-summary'),
        factoriesWith({
          ticketSummary: () => summaryDeps({ broadcastError: new Error('LINE down') }),
        }),
      )
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Internal server error during ticket summary processing');
    assertEquals(body.details, {
      errorType: 'UnknownError',
      errorMessage:
        'Ticket summary notification failed: Ticket summary notification failed: LINE down',
    });

    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['ERROR', 'Ticket summary notification failed'],
      ['ERROR', 'Ticket summary notification failed'],
      ['ERROR', 'Unexpected error in ticket summary processing'],
    ]);
    assertEquals(logs[2].jsonPayload, {
      category: 'NOTIFICATION',
      context: { stage: 'TicketSummaryController' },
      error: {
        message:
          'Ticket summary notification failed: Ticket summary notification failed: LINE down',
        recoverable: false,
      },
    });
  });

  await t.step('DB の AppError も素の Error に包まれ、想定外エラーとして応答する', async () => {
    const { result: response, logs } = await captureLogs(() =>
      handleRequest(
        post('/api/ticket-summary'),
        factoriesWith({
          ticketSummary: () =>
            summaryDeps({
              findError: new DatabaseError(
                'TicketRepository',
                'findByStatusIn',
                'x',
                ErrorCodes.DB_FETCH_ERROR,
              ),
            }),
        }),
      )
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Internal server error during ticket summary processing');
    assertEquals(body.details, {
      errorType: 'UnknownError',
      errorMessage: 'Ticket summary notification failed: [TicketRepository.findByStatusIn] x',
    });
    assertEquals(logs.at(-1)?.severity, 'ERROR');
  });
});

Deno.test('send-notification', async (t) => {
  const ticket = Ticket.fromExisting({
    id: 't-1',
    matchName: 'テスト試合',
    matchDate: new Date('2024-03-15T19:00:00+09:00'),
    homeTeam: null,
    awayTeam: null,
    competition: null,
    venue: null,
    saleStartDate: new Date('2024-03-01T10:00:00+09:00'),
    saleEndDate: null,
    saleStatus: 'before_sale',
    ticketTypes: [],
    ticketUrl: null,
    notificationScheduled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
  });

  const notificationDeps = (
    options: { ticket?: Ticket | null; broadcastError?: Error } = {},
  ) => {
    const calls: string[] = [];
    const deps: SendNotificationDeps = {
      ticketRepository: {
        findById: (id) => {
          calls.push(`findById:${id}`);
          return Promise.resolve(options.ticket === undefined ? ticket : options.ticket);
        },
      },
      notificationRepository: {
        findByTicketId: () => Promise.resolve<Notification[]>([]),
        save: () => Promise.resolve(),
        update: (notification) => {
          calls.push(`update:${notification.status}`);
          return Promise.resolve();
        },
      },
      lineClient: {
        broadcast: () => {
          calls.push('broadcast');
          return options.broadcastError
            ? Promise.reject(options.broadcastError)
            : Promise.resolve();
        },
      },
      sleep: () => Promise.resolve(),
    };
    return { deps, calls };
  };

  const validBody = JSON.stringify({ ticketId: 't-1', notificationType: 'day_before' });

  await t.step('成功時は 200', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleRequest(
      post('/api/send-notification', validBody),
      factoriesWith({ sendNotification: () => deps }),
    );
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(Object.keys(body), [
      'status',
      'message',
      'ticketId',
      'notificationType',
      'executionTimeMs',
      'timestamp',
    ]);
    assertEquals(body.status, 'success');
    assertEquals(body.message, 'Notification sent successfully');
    assertEquals(body.ticketId, 't-1');
    assertEquals(body.notificationType, 'day_before');
    assertEquals(typeof body.executionTimeMs, 'number');
    assertEquals(calls, ['findById:t-1', 'broadcast', 'update:sent']);
  });

  await t.step('LINE が 3 回失敗しても 200（failed を記録する）', async () => {
    const { deps, calls } = notificationDeps({ broadcastError: new Error('LINE down') });
    const { result: response, logs } = await captureLogs(() =>
      handleRequest(
        post('/api/send-notification', validBody),
        factoriesWith({ sendNotification: () => deps }),
      )
    );
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.message, 'Notification sent successfully');
    assertEquals(calls.at(-1), 'update:failed');
    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['ERROR', 'Notification failed after maximum retries'],
    ]);
  });

  await t.step('チケットがなければ 500 と ERROR ログ 2 件', async () => {
    const { deps } = notificationDeps({ ticket: null });
    const { result: response, logs } = await captureLogs(() =>
      handleRequest(
        post('/api/send-notification', validBody),
        factoriesWith({ sendNotification: () => deps }),
      )
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Notification processing failed');
    assertEquals(Object.keys(body.details), [
      'ticketId',
      'notificationType',
      'errorMessage',
      'executionTimeMs',
    ]);
    assertEquals(body.details.ticketId, 't-1');
    assertEquals(body.details.notificationType, 'day_before');
    assertEquals(body.details.errorMessage, 'Ticket not found: t-1');
    assertEquals(typeof body.details.executionTimeMs, 'number');
    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['ERROR', 'Scheduled notification processing failed'],
      ['ERROR', 'Scheduled notification failed'],
    ]);
  });

  await t.step('body が JSON でなければ 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleRequest(
      post('/api/send-notification', 'not json'),
      factoriesWith({ sendNotification: () => deps }),
    );
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.error, 'Bad Request');
    assertEquals(body.details, 'Invalid request body format');
    assertEquals(calls, []);
  });

  await t.step('ticketId が空なら 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleRequest(
      post(
        '/api/send-notification',
        JSON.stringify({ ticketId: '', notificationType: 'invalid_type' }),
      ),
      factoriesWith({ sendNotification: () => deps }),
    );
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.error, 'Bad Request');
    assertEquals(body.details, 'ticketId is required and must be a string');
    assertEquals(calls, []);
  });

  await t.step('notificationType が不正なら 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleRequest(
      post(
        '/api/send-notification',
        JSON.stringify({ ticketId: 't-1', notificationType: 'invalid_notification_type' }),
      ),
      factoriesWith({ sendNotification: () => deps }),
    );
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.details, 'Invalid notificationType: invalid_notification_type');
    assertEquals(calls, []);
  });

  await t.step('検証中の想定外エラー（細工した body）は 500 と CRITICAL ログ', async () => {
    const { deps, calls } = notificationDeps();
    const { result: response, logs } = await captureLogs(() =>
      handleRequest(
        post(
          '/api/send-notification',
          JSON.stringify({ ticketId: 'a', notificationType: { toString: 1 } }),
        ),
        factoriesWith({ sendNotification: () => deps }),
      )
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Internal Server Error');
    assertEquals(body.details, 'Cannot convert object to primitive value');
    assertEquals(calls, []);

    assertEquals(logs.length, 1);
    assertEquals(logs[0].severity, 'CRITICAL');
    assertEquals(logs[0].message, 'Unexpected error in NotificationController');
    assertEquals(logs[0].jsonPayload, {
      category: 'NOTIFICATION',
      error: { message: 'Cannot convert object to primitive value', recoverable: false },
    });
  });
});
