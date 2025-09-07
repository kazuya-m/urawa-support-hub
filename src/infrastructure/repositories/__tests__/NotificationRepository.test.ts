import { assertEquals, assertRejects } from 'jsr:@std/assert';
import { NotificationRepository } from '../NotificationRepository.ts';
import { Notification } from '@/domain/entities/index.ts';
import { NotificationRow } from '@/infrastructure/types/database.ts';
import { createMockSupabaseClient } from './test-utils/SupabaseMock.ts';
import { RepositoryError } from '../../utils/error-handler.ts';

Deno.test('SupabaseNotificationRepository - findById with error handling', async () => {
  const mockNotificationRow: NotificationRow = {
    id: 'test-notification-id',
    ticket_id: 'test-ticket-id',
    notification_type: 'day_before',
    scheduled_at: '2025-03-15T20:00:00+09:00',
    sent_at: null,
    status: 'scheduled',
    error_message: null,
    cloud_task_id: null,
    created_at: '2025-01-01T00:00:00Z',
  };

  const mockClient = createMockSupabaseClient([mockNotificationRow]);
  const repository = new NotificationRepository(mockClient);

  const result = await repository.findById('test-notification-id');

  assertEquals(result?.id, 'test-notification-id');
  assertEquals(result?.ticketId, 'test-ticket-id');
  assertEquals(result?.notificationType, 'day_before');
  assertEquals(result?.status, 'scheduled');
});

Deno.test('SupabaseNotificationRepository - save error handling', async () => {
  const mockClient = createMockSupabaseClient([], {
    shouldError: true,
    errorMessage: 'Database error',
  });
  const repository = new NotificationRepository(mockClient);

  const testNotification = new Notification({
    id: 'test-id',
    ticketId: 'test-ticket-id',
    notificationType: 'day_before',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
    status: 'scheduled',
    createdAt: new Date(),
  });

  await assertRejects(
    () => repository.save(testNotification),
    RepositoryError,
    'Failed to save notification: Database error',
  );
});
