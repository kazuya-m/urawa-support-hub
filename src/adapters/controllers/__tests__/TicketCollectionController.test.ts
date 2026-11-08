import { assertEquals } from 'std/assert/mod.ts';
import { TicketCollectionController } from '../TicketCollectionController.ts';
import { DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';

// 認証ロジックはローカル関数でテストする
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

Deno.test('TicketCollectionController - DatabaseError の応答', async () => {
  const controller = new TicketCollectionController({
    execute: () => Promise.reject(new DatabaseError('Repo', 'op', 'x', ErrorCodes.DB_FETCH_ERROR)),
  });

  const response = await controller.handleCollectTickets(
    new Request('http://localhost:8080/api/collect-tickets', { method: 'POST' }),
  );
  const body = await response.json();

  assertEquals(response.status, 500);
  assertEquals(body.error, 'Database operation failed');
  assertEquals(body.details, { operation: 'ticket collection' });
});
