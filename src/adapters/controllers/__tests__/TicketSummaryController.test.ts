import { assertEquals } from 'std/assert/mod.ts';
import { TicketSummaryController } from '../TicketSummaryController.ts';
import { DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';

Deno.test('TicketSummaryController - エラー応答', async (t) => {
  const request = new Request('http://localhost:8080/api/ticket-summary', { method: 'POST' });

  await t.step('DatabaseError', async () => {
    const controller = new TicketSummaryController({
      execute: () =>
        Promise.reject(new DatabaseError('Repo', 'op', 'x', ErrorCodes.DB_FETCH_ERROR)),
    });

    const response = await controller.handleTicketSummary(request);
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Database error during ticket summary processing');
    assertEquals(body.details, { errorType: 'DatabaseError', errorMessage: '[Repo.op] x' });
  });
});
