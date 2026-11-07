import { assert, assertEquals, assertStringIncludes } from 'std/assert/mod.ts';
import { AppError } from '../AppError.ts';
import { ErrorCodes } from '../ErrorCodes.ts';

Deno.test('AppError - code / cause / context を保持する', () => {
  const cause = new Error('root cause');
  const error = new AppError('[UseCase] failed', ErrorCodes.USECASE_EXECUTION_FAILED, cause, {
    sessionId: 's-1',
  });

  assert(error instanceof Error);
  assertEquals(error.name, 'AppError');
  assertEquals(error.message, '[UseCase] failed');
  assertEquals(error.code, 'USECASE_EXECUTION_FAILED');
  assertEquals(error.cause, cause);
  assertEquals(error.context, { sessionId: 's-1' });
});

Deno.test('AppError - formatMessage は [code] message 形式', () => {
  const error = new AppError('[UseCase] failed', ErrorCodes.TICKET_COLLECTION_FAILED);

  assertEquals(error.formatMessage(), '[TICKET_COLLECTION_FAILED] [UseCase] failed');
});

Deno.test('AppError - cause の stack を Caused by として連結する', () => {
  const cause = new Error('root cause');
  const error = new AppError('wrapped', ErrorCodes.USECASE_EXECUTION_FAILED, cause);

  assertStringIncludes(error.stack ?? '', `Caused by: ${cause.stack}`);
});

Deno.test('AppError - cause / context は省略可能', () => {
  const error = new AppError('no cause', ErrorCodes.USECASE_EXECUTION_FAILED);

  assertEquals(error.cause, undefined);
  assertEquals(error.context, undefined);
  assertEquals((error.stack ?? '').includes('Caused by:'), false);
});
