import { assertEquals } from 'std/assert/mod.ts';
import { withErrorHandling } from '../withErrorHandling.ts';
import {
  TICKET_COLLECTION_ERROR_OPTIONS,
  TicketCollectionController,
} from '@/adapters/controllers/TicketCollectionController.ts';
import {
  NOTIFICATION_ERROR_OPTIONS,
  NotificationController,
} from '@/adapters/controllers/NotificationController.ts';
import {
  TICKET_SUMMARY_ERROR_OPTIONS,
  TicketSummaryController,
} from '@/adapters/controllers/TicketSummaryController.ts';
import { AppError, ErrorCodes } from '@/shared/errors/index.ts';
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
  const logs: LogEntry[] = [];
  const originalLog = console.log;
  const originalNodeEnv = Deno.env.get('NODE_ENV');
  console.log = (line: string) => logs.push(JSON.parse(line));
  Deno.env.set('NODE_ENV', 'production');
  try {
    const result = await fn();
    return { result, logs };
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
