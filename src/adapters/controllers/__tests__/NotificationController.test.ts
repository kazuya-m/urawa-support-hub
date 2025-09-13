import { assertEquals } from 'std/assert/mod.ts';
import { NotificationController } from '../NotificationController.ts';
import { NOTIFICATION_TYPES } from '@/domain/entities/NotificationTypes.ts';
import { MockNotificationUseCase } from '@/shared/testing/mocks/MockNotificationUseCase.ts';

Deno.test('NotificationController', async (t) => {
  const originalEnv = {
    LINE_CHANNEL_ACCESS_TOKEN: Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN'),
    NODE_ENV: Deno.env.get('NODE_ENV'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  };

  Deno.env.set('LINE_CHANNEL_ACCESS_TOKEN', 'test-line-token');
  Deno.env.set('NODE_ENV', 'test');
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

  await t.step('should handle valid send notification request', async () => {
    const mockUseCase = new MockNotificationUseCase();
    mockUseCase.setMockResults([{
      status: 'success' as const,
      ticketId: 'test-ticket-123',
      notificationType: 'day_before',
      executionDurationMs: 100,
    }]);

    const controller = new NotificationController(mockUseCase);

    const requestBody = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    const request = new Request('http://localhost/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await controller.handleSendNotification(request);

    assertEquals(response.status, 200);

    const executedInputs = mockUseCase.getExecutedInputs();
    assertEquals(executedInputs.length, 1);

    const responseBody = await response.json();
    assertEquals(responseBody.status, 'success');
    assertEquals(responseBody.ticketId, 'test-ticket-123');
  });

  await t.step('should reject invalid request body', async () => {
    const mockUseCase = new MockNotificationUseCase();
    const controller = new NotificationController(mockUseCase);

    const invalidRequestBody = {
      ticketId: '', // 空のID
      notificationType: 'invalid_type', // 不正なタイプ
    };

    const request = new Request('http://localhost/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(invalidRequestBody),
    });

    const response = await controller.handleSendNotification(request);

    assertEquals(response.status, 400);
    const responseBody = await response.json();
    assertEquals(responseBody.error, 'Bad Request');
  });

  await t.step('should validate notification type', async () => {
    const mockUseCase = new MockNotificationUseCase();
    const controller = new NotificationController(mockUseCase);

    const requestBody = {
      ticketId: 'test-ticket-123',
      notificationType: 'invalid_notification_type',
    };

    const request = new Request('http://localhost/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await controller.handleSendNotification(request);

    assertEquals(response.status, 400);
    const responseBody = await response.json();
    assertEquals(responseBody.error, 'Bad Request');
    assertEquals(
      responseBody.details,
      'Invalid notificationType: invalid_notification_type',
    );
  });

  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  });
});
