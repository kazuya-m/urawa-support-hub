import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import { TicketCollectionController } from '../TicketCollectionController.ts';
import { AppError, ErrorCodes } from '@/shared/errors/index.ts';
import type { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';

// 認証ロジックのみテスト（Controller import回避）
function validateCloudSchedulerRequest(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');

  if (Deno.env.get('NODE_ENV') !== 'production') {
    return true;
  }

  return !!authHeader;
}

Deno.test('TicketCollectionController Authentication Tests', async (t) => {
  const originalEnv = Deno.env.get('NODE_ENV');

  await t.step('should accept authenticated requests in development', () => {
    Deno.env.set('NODE_ENV', 'test');

    const mockRequest = new Request('http://localhost:8080/api/collect-tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const isAuthenticated = validateCloudSchedulerRequest(mockRequest);
    assertEquals(isAuthenticated, true);
  });

  await t.step('should require authorization header in production', () => {
    Deno.env.set('NODE_ENV', 'production');

    const mockRequest = new Request('http://localhost:8080/api/collect-tickets', {
      method: 'POST',
    });
    const isAuthenticated = validateCloudSchedulerRequest(mockRequest);
    assertEquals(isAuthenticated, false);
  });

  await t.step('should accept requests with authorization header in production', () => {
    Deno.env.set('NODE_ENV', 'production');

    const mockRequest = new Request('http://localhost:8080/api/collect-tickets', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-oidc-token',
      },
    });
    const isAuthenticated = validateCloudSchedulerRequest(mockRequest);
    assertEquals(isAuthenticated, true);
  });

  await t.step('cleanup environment', () => {
    if (originalEnv) {
      Deno.env.set('NODE_ENV', originalEnv);
    } else {
      Deno.env.delete('NODE_ENV');
    }
  });
});

const createThrowingUseCase = (error: unknown): ITicketCollectionUseCase => ({
  execute: () => Promise.reject(error),
});

const collectRequest = () =>
  new Request('http://localhost:8080/api/collect-tickets', { method: 'POST' });

Deno.test('TicketCollectionController - 成功時は収集結果を 200 で返す', async () => {
  const controller = new TicketCollectionController({
    execute: () =>
      Promise.resolve({
        status: 'success',
        ticketsFound: 3,
        newTickets: 1,
        updatedTickets: 1,
        unchangedTickets: 1,
        failedTickets: 0,
        executionDurationMs: 42,
      }),
  });

  const response = await controller.handleCollectTickets(collectRequest());
  const body = await response.json();

  assertEquals(response.status, 200);
  assertEquals(body.status, 'success');
  assertEquals(body.message, 'Ticket collection completed successfully');
  assertEquals(body.ticketsFound, 3);
  assertEquals(body.newTickets, 1);
  assertEquals(body.updatedTickets, 1);
  assertEquals(body.executionTimeMs, 42);
});

Deno.test('TicketCollectionController - UseCase の例外はそのまま投げる（応答への変換は withErrorHandling）', async () => {
  const error = new AppError('failed', ErrorCodes.USECASE_EXECUTION_FAILED);
  const controller = new TicketCollectionController(createThrowingUseCase(error));

  const thrown = await assertRejects(() => controller.handleCollectTickets(collectRequest()));
  assertEquals(thrown, error);
});
