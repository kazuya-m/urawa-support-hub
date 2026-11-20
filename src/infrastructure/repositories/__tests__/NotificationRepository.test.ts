import { assertEquals } from 'std/assert/mod.ts';
import { NotificationRepository } from '../NotificationRepository.ts';
import { NotificationRow } from '@/infrastructure/types/database.ts';
import { createMockSupabaseClient } from './test-utils/SupabaseMock.ts';

Deno.test('SupabaseNotificationRepository - findById with error handling', async () => {
  const mockNotificationRow: NotificationRow = {
    id: 'test-notification-id',
    ticket_id: 'test-ticket-id',
    notification_type: 'day_before',
    notification_time: '2025-03-15T20:00:00+09:00',
    sent_at: null,
    status: 'scheduled',
    error_message: null,
    cloud_task_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    claimed_at: null,
    message: null,
  };

  const mockClient = createMockSupabaseClient([mockNotificationRow]);
  const repository = new NotificationRepository(mockClient);

  const result = await repository.findById('test-notification-id');

  assertEquals(result?.id, 'test-notification-id');
  assertEquals(result?.ticketId, 'test-ticket-id');
  assertEquals(result?.notificationType, 'day_before');
  assertEquals(result?.status, 'scheduled');
});
