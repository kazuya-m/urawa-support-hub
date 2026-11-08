import { assertEquals } from 'std/assert/mod.ts';
import { type ErrorHandlingOptions, withErrorHandling } from '../withErrorHandling.ts';
import {
  NOTIFICATION_ERROR_OPTIONS,
  TICKET_COLLECTION_ERROR_OPTIONS,
  TICKET_SUMMARY_ERROR_OPTIONS,
} from '../routeErrorOptions.ts';
import { TicketCollectionController } from '@/adapters/controllers/TicketCollectionController.ts';
import { NotificationController } from '@/adapters/controllers/NotificationController.ts';
import { TicketSummaryController } from '@/adapters/controllers/TicketSummaryController.ts';
import { AppError, DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import type { INotificationUseCase } from '@/application/interfaces/usecases/INotificationUseCase.ts';

type LogEntry = {
  severity: string;
  message: string;
  jsonPayload?: Record<string, unknown>;
};

/**
 * 処理中の CloudLogger の出力（console.log の JSON）を捕まえる
 * 本番と同じく stack を出さないよう、実行中だけ NODE_ENV=production にする
 */
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

const respondCollect = (useCase: ConstructorParameters<typeof TicketCollectionController>[0]) =>
  withErrorHandling(
    () =>
      new TicketCollectionController(useCase).handleCollectTickets(post('/api/collect-tickets')),
    TICKET_COLLECTION_ERROR_OPTIONS,
  );

const respondNotification = (useCase: INotificationUseCase, body: string) =>
  withErrorHandling(
    () =>
      new NotificationController(useCase).handleSendNotification(
        post('/api/send-notification', body),
      ),
    NOTIFICATION_ERROR_OPTIONS,
  );

const respondSummary = (useCase: ConstructorParameters<typeof TicketSummaryController>[0]) =>
  withErrorHandling(
    () => new TicketSummaryController(useCase).handleTicketSummary(post('/api/ticket-summary')),
    TICKET_SUMMARY_ERROR_OPTIONS,
  );

Deno.test('collect-tickets: UseCase の AppError', async () => {
  const { result: response, logs } = await captureLogs(() =>
    respondCollect({
      execute: () =>
        Promise.reject(
          new AppError(
            '[TicketCollectionUseCase] Ticket collection failed: boom',
            ErrorCodes.USECASE_EXECUTION_FAILED,
            undefined,
            { sessionId: 's-1', executionDurationMs: 5 },
          ),
        ),
    })
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(
    body.error,
    '[USECASE_EXECUTION_FAILED] [TicketCollectionUseCase] Ticket collection failed: boom',
  );
  assertEquals(body.details, { sessionId: 's-1', executionDurationMs: 5 });

  assertEquals(logs.length, 1);
  assertEquals(logs[0].severity, 'ERROR');
  assertEquals(logs[0].message, 'UseCase error in ticket collection');
  assertEquals(logs[0].jsonPayload, {
    category: 'TICKET_COLLECTION',
    error: {
      details: '[TicketCollectionUseCase] Ticket collection failed: boom',
      recoverable: true,
    },
  });
});

Deno.test('collect-tickets: 想定外エラーの応答', async () => {
  const { result: response } = await captureLogs(() =>
    respondCollect({ execute: () => Promise.reject(new Error('unexpected')) })
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Ticket collection failed');
  assertEquals(body.details, 'unexpected');
});

Deno.test('send-notification: 検証中の想定外エラー（細工した body）', async () => {
  const useCase: INotificationUseCase = {
    execute: () => Promise.reject(new Error('should not be called')),
  };
  const { result: response, logs } = await captureLogs(() =>
    respondNotification(
      useCase,
      JSON.stringify({ ticketId: 'a', notificationType: { toString: 1 } }),
    )
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Internal Server Error');
  assertEquals(body.details, 'Cannot convert object to primitive value');

  assertEquals(logs.length, 1);
  assertEquals(logs[0].severity, 'CRITICAL');
  assertEquals(logs[0].message, 'Unexpected error in NotificationController');
  assertEquals(logs[0].jsonPayload, {
    category: 'NOTIFICATION',
    error: { message: 'Cannot convert object to primitive value', recoverable: false },
  });
});

Deno.test('send-notification: UseCase がエラー結果を返したときの応答', async () => {
  const useCase: INotificationUseCase = {
    execute: () =>
      Promise.resolve({
        status: 'error' as const,
        ticketId: 't-1',
        notificationType: 'day_before',
        executionDurationMs: 7,
        errorMessage: 'LINE failed',
      }),
  };
  const response = await respondNotification(
    useCase,
    JSON.stringify({ ticketId: 't-1', notificationType: 'day_before' }),
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Notification processing failed');
  assertEquals(body.details, {
    ticketId: 't-1',
    notificationType: 'day_before',
    errorMessage: 'LINE failed',
    executionTimeMs: 7,
  });
});

Deno.test('ticket-summary: UseCase の想定外エラー', async () => {
  const { result: response, logs } = await captureLogs(() =>
    respondSummary({ execute: () => Promise.reject(new Error('summary failed')) })
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Internal server error during ticket summary processing');
  assertEquals(body.details, { errorType: 'UnknownError', errorMessage: 'summary failed' });

  assertEquals(logs.length, 1);
  assertEquals(logs[0].severity, 'ERROR');
  assertEquals(logs[0].message, 'Unexpected error in ticket summary processing');
  assertEquals(logs[0].jsonPayload, {
    category: 'NOTIFICATION',
    context: { processingStage: 'TicketSummaryController' },
    error: { message: 'summary failed', recoverable: false },
  });
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
