import { assertEquals, assertRejects } from "std/assert/mod.ts";
import { NotificationRepositoryImpl } from '../NotificationRepositoryImpl.ts';
import { NotificationHistory, NotificationRow } from '@/domain/entities/index.ts';
import { createMockSupabaseClient } from './test-utils/SupabaseMock.ts';
import { RepositoryError } from '../../utils/error-handler.ts';

Deno.test("SupabaseNotificationRepository - findById with error handling", async () => {
  const mockNotificationRow: NotificationRow = {
    id: 'test-notification-id',
    ticket_id: 'test-ticket-id',
    notification_type: 'day_before',
    scheduled_at: '2025-03-15T20:00:00+09:00',
    sent_at: null,
    status: 'pending',
    error_message: null,
    created_at: '2025-01-01T00:00:00Z'
  };

  const mockClient = createMockSupabaseClient([mockNotificationRow]);
  const repository = new NotificationRepositoryImpl(mockClient);

  const result = await repository.findById('test-notification-id');

  assertEquals(result?.id, 'test-notification-id');
  assertEquals(result?.ticketId, 'test-ticket-id');
  assertEquals(result?.notificationType, 'day_before');
  assertEquals(result?.status, 'pending');
});

Deno.test("SupabaseNotificationRepository - save error handling", async () => {
  const mockClient = createMockSupabaseClient([], { 
    shouldError: true, 
    errorMessage: 'Database error' 
  });
  const repository = new NotificationRepositoryImpl(mockClient);

  const testNotification = new NotificationHistory({
    id: 'test-id',
    ticketId: 'test-ticket-id',
    notificationType: 'day_before',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
    status: 'pending',
    createdAt: new Date()
  });

  await assertRejects(
    () => repository.save(testNotification),
    RepositoryError,
    'Failed to save notification: Database error'
  );
});