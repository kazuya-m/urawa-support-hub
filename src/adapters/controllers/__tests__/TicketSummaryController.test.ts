import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import { TicketSummaryController } from '../TicketSummaryController.ts';
import type { ITicketSummaryUseCase } from '@/application/interfaces/usecases/ITicketSummaryUseCase.ts';

const summaryRequest = () =>
  new Request('http://localhost:8080/api/ticket-summary', { method: 'POST' });

Deno.test('TicketSummaryController - 成功時は 200 を返す', async () => {
  let executed = 0;
  const useCase: ITicketSummaryUseCase = {
    execute: () => {
      executed++;
      return Promise.resolve();
    },
  };
  const controller = new TicketSummaryController(useCase);

  const response = await controller.handleTicketSummary(summaryRequest());
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.status, 'success');
  assertEquals(body.message, 'Ticket summary processed successfully');
  assertEquals(executed, 1);
});

Deno.test('TicketSummaryController - UseCase の例外はそのまま投げる（応答への変換は withErrorHandling）', async () => {
  const useCase: ITicketSummaryUseCase = {
    execute: () => Promise.reject(new Error('Ticket summary notification failed: boom')),
  };
  const controller = new TicketSummaryController(useCase);

  await assertRejects(
    () => controller.handleTicketSummary(summaryRequest()),
    Error,
    'Ticket summary notification failed: boom',
  );
});
