import { assert, assertEquals } from 'std/assert/mod.ts';
import { AppError, DatabaseError, ErrorCodes } from '../index.ts';

Deno.test('DatabaseError', async (t) => {
  await t.step('メッセージに [repository.operation] を付け、code・context を保持する', () => {
    const error = new DatabaseError(
      'TicketRepository',
      'findByIds',
      'connection refused',
      ErrorCodes.DB_FETCH_ERROR,
      undefined,
      { table: 'tickets' },
    );

    assertEquals(error.message, '[TicketRepository.findByIds] connection refused');
    assertEquals(error.code, 'DB_FETCH_ERROR');
    assertEquals(error.context, { table: 'tickets', type: 'DATABASE' });
    assertEquals(
      error.formatMessage(),
      '[DB_FETCH_ERROR] [TicketRepository.findByIds] connection refused',
    );
    assertEquals(error.name, 'DatabaseError');
    assert(error instanceof AppError);
    assert(error instanceof Error);
    assertEquals(
      error.stack?.split('\n')[0],
      'DatabaseError: [TicketRepository.findByIds] connection refused',
    );
  });

  await t.step('cause が stack を持つ Error なら stack に Caused by: を付ける', () => {
    const cause = new Error('root cause');
    const error = new DatabaseError('Repo', 'op', 'failed', ErrorCodes.DB_SAVE_ERROR, cause);

    assertEquals(error.cause, cause);
    assert(error.stack?.includes(`\nCaused by: ${cause.stack}`));
  });

  await t.step('cause が stack を持たないオブジェクトなら Caused by: を付けない', () => {
    const supabaseError = { message: 'duplicate key', code: '23505' };
    const error = new DatabaseError(
      'Repo',
      'op',
      'failed',
      ErrorCodes.DB_SAVE_ERROR,
      supabaseError as unknown as Error,
    );

    assertEquals(error.cause, supabaseError as unknown as Error);
    assertEquals(error.stack?.includes('Caused by:'), false);
  });
});

Deno.test('AppError', async (t) => {
  await t.step('message・code・cause・context を保持し、name はクラス名になる', () => {
    const cause = new Error('root cause');
    const error = new AppError('[UseCase] failed', ErrorCodes.USECASE_EXECUTION_FAILED, cause, {
      sessionId: 's-1',
    });

    assertEquals(error.message, '[UseCase] failed');
    assertEquals(error.code, 'USECASE_EXECUTION_FAILED');
    assertEquals(error.cause, cause);
    assertEquals(error.context, { sessionId: 's-1' });
    assertEquals(error.name, 'AppError');
    assertEquals(error.formatMessage(), '[USECASE_EXECUTION_FAILED] [UseCase] failed');
  });

  await t.step('cause と context は省略できる', () => {
    const error = new AppError('failed', ErrorCodes.TICKET_COLLECTION_FAILED);

    assertEquals(error.cause, undefined);
    assertEquals(error.context, undefined);
  });
});
