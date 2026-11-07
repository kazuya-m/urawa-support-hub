import { assertEquals } from 'std/assert/mod.ts';
import { stub } from 'std/testing/mock.ts';
import { withErrorHandling } from '../withErrorHandling.ts';
import {
  NOTIFICATION_ERROR_CONTEXT,
  TICKET_COLLECTION_ERROR_CONTEXT,
  TICKET_SUMMARY_ERROR_CONTEXT,
} from '../routeErrorContexts.ts';
import { HttpResponseBuilder } from '../HttpResponseBuilder.ts';
import { AppError, DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { toErrorInfo } from '@/shared/utils/errorUtils.ts';

/**
 * CloudLogger の error / critical 呼び出しを記録しながら handler を実行する
 */
async function runWithLoggerStub(fn: () => Promise<Response>) {
  const errorStub = stub(CloudLogger, 'error', () => {});
  const criticalStub = stub(CloudLogger, 'critical', () => {});
  try {
    const response = await fn();
    const body = await response.json();
    return {
      response,
      body,
      errorCalls: errorStub.calls.map((c) => c.args),
      criticalCalls: criticalStub.calls.map((c) => c.args),
    };
  } finally {
    errorStub.restore();
    criticalStub.restore();
  }
}

const throwing = (error: unknown) => () => Promise.reject(error);

Deno.test('withErrorHandling - 正常時は handler の Response をそのまま返す', async () => {
  const { response, body, errorCalls, criticalCalls } = await runWithLoggerStub(() =>
    withErrorHandling(
      () => Promise.resolve(HttpResponseBuilder.success({ message: 'ok' })),
      TICKET_COLLECTION_ERROR_CONTEXT,
    )
  );

  assertEquals(response.status, 200);
  assertEquals(body.status, 'success');
  assertEquals(body.message, 'ok');
  assertEquals(errorCalls.length, 0);
  assertEquals(criticalCalls.length, 0);
});

Deno.test('withErrorHandling - AppError は formatMessage と context を 500 で返し error ログを出す', async () => {
  const error = new AppError(
    '[TicketCollectionUseCase] Ticket collection failed: boom',
    ErrorCodes.USECASE_EXECUTION_FAILED,
    undefined,
    { sessionId: 's-1', executionDurationMs: 10 },
  );

  const { response, body, errorCalls, criticalCalls } = await runWithLoggerStub(() =>
    withErrorHandling(throwing(error), TICKET_COLLECTION_ERROR_CONTEXT)
  );

  assertEquals(response.status, 500);
  assertEquals(response.headers.get('Content-Type'), 'application/json');
  assertEquals(
    body.error,
    '[USECASE_EXECUTION_FAILED] [TicketCollectionUseCase] Ticket collection failed: boom',
  );
  assertEquals(body.details, { sessionId: 's-1', executionDurationMs: 10 });
  // 変更前の TicketCollectionController と同じログ
  assertEquals(errorCalls, [[
    'UseCase error in ticket collection',
    {
      category: LogCategory.TICKET_COLLECTION,
      error: { details: error.message, recoverable: true },
    },
  ]]);
  assertEquals(criticalCalls.length, 0);
});

Deno.test('withErrorHandling - DatabaseError は AppError と同じ形式で返す', async () => {
  const error = new DatabaseError(
    'TicketRepository',
    'upsert',
    'failed',
    ErrorCodes.DB_SAVE_ERROR,
  );

  const { response, body } = await runWithLoggerStub(() =>
    withErrorHandling(throwing(error), TICKET_COLLECTION_ERROR_CONTEXT)
  );

  assertEquals(response.status, 500);
  assertEquals(body.error, '[DB_SAVE_ERROR] [TicketRepository.upsert] failed');
  assertEquals(body.details, { type: 'DATABASE' });
});

Deno.test('withErrorHandling - send-notification の想定外エラーは従来どおり critical ログと文字列 details', async () => {
  // 細工した body で validator が投げる TypeError と同じもの
  const error = new TypeError('Cannot convert object to primitive value');

  const { response, body, errorCalls, criticalCalls } = await runWithLoggerStub(() =>
    withErrorHandling(throwing(error), NOTIFICATION_ERROR_CONTEXT)
  );

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Internal Server Error');
  assertEquals(body.details, 'Cannot convert object to primitive value');
  assertEquals(errorCalls.length, 0);
  assertEquals(criticalCalls, [[
    'Unexpected error in NotificationController',
    {
      category: LogCategory.NOTIFICATION,
      error: toErrorInfo(error, undefined, false),
    },
  ]]);
});

Deno.test('withErrorHandling - ticket-summary の想定外エラーは従来どおり UnknownError 形式', async () => {
  const error = new Error('Ticket summary notification failed: LINE down');

  const { response, body, errorCalls, criticalCalls } = await runWithLoggerStub(() =>
    withErrorHandling(throwing(error), TICKET_SUMMARY_ERROR_CONTEXT)
  );

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Internal server error during ticket summary processing');
  assertEquals(body.details, {
    errorType: 'UnknownError',
    errorMessage: 'Ticket summary notification failed: LINE down',
  });
  assertEquals(errorCalls, [[
    'Unexpected error in ticket summary processing',
    {
      category: LogCategory.NOTIFICATION,
      context: { processingStage: 'TicketSummaryController' },
      error: toErrorInfo(error, undefined, false),
    },
  ]]);
  assertEquals(criticalCalls.length, 0);
});

Deno.test('withErrorHandling - collect-tickets の想定外エラーは従来どおり critical / SYSTEM', async () => {
  const error = new Error('unexpected');

  const { response, body, criticalCalls } = await runWithLoggerStub(() =>
    withErrorHandling(throwing(error), TICKET_COLLECTION_ERROR_CONTEXT)
  );

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Ticket collection failed');
  assertEquals(body.details, 'unexpected');
  assertEquals(criticalCalls, [[
    'Unexpected error in TicketCollectionController',
    {
      category: LogCategory.SYSTEM,
      error: toErrorInfo(error, undefined, false),
    },
  ]]);
});

Deno.test('withErrorHandling - Error 以外の throw もメッセージに変換する', async () => {
  const { response, body } = await runWithLoggerStub(() =>
    withErrorHandling(throwing('plain string'), TICKET_SUMMARY_ERROR_CONTEXT)
  );

  assertEquals(response.status, 500);
  assertEquals(body.details, { errorType: 'UnknownError', errorMessage: 'plain string' });
});
