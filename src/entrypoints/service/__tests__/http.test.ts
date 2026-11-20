import { assertEquals } from 'std/assert/mod.ts';
import { type ErrorHandlingOptions, withErrorHandling } from '../http.ts';
import { DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';
import { LogCategory } from '@/shared/logging/types.ts';

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
