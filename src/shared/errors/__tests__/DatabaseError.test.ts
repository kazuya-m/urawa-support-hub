import { assert, assertEquals } from 'std/assert/mod.ts';
import { AppError } from '../AppError.ts';
import { DatabaseError } from '../DatabaseError.ts';
import { ErrorCodes } from '../ErrorCodes.ts';

Deno.test('DatabaseError - message に [repository.operation] を付与する', () => {
  const error = new DatabaseError(
    'TicketRepository',
    'upsert',
    'duplicate key',
    ErrorCodes.DB_SAVE_ERROR,
  );

  assertEquals(error.message, '[TicketRepository.upsert] duplicate key');
  assertEquals(error.code, 'DB_SAVE_ERROR');
  assertEquals(error.name, 'DatabaseError');
  assertEquals(error.formatMessage(), '[DB_SAVE_ERROR] [TicketRepository.upsert] duplicate key');
});

Deno.test('DatabaseError - context に type: DATABASE を付与する', () => {
  const error = new DatabaseError(
    'NotificationRepository',
    'save notification',
    'failed',
    ErrorCodes.DB_SAVE_ERROR,
    undefined,
    { table: 'notifications' },
  );

  assertEquals(error.context, { table: 'notifications', type: 'DATABASE' });
});

Deno.test('DatabaseError - context 省略時も type: DATABASE を持つ', () => {
  const error = new DatabaseError('Repo', 'find', 'failed', ErrorCodes.DB_FETCH_ERROR);

  assertEquals(error.context, { type: 'DATABASE' });
});

Deno.test('DatabaseError - AppError のサブクラスである', () => {
  const cause = new Error('supabase error');
  const error = new DatabaseError('Repo', 'find', 'failed', ErrorCodes.DB_FETCH_ERROR, cause);

  assert(error instanceof AppError);
  assertEquals(error.cause, cause);
});
