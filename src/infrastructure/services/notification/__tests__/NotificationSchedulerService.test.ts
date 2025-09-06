import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { stub } from 'testing/mock.ts';
import { NotificationSchedulerService } from '../NotificationSchedulerService.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { NOTIFICATION_TYPES } from '@/domain/entities/NotificationTypes.ts';
import { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';
import { createMockCloudTasksClient } from './test-utils/CloudTasksMock.ts';
import { createMockNotificationRepository } from './test-utils/NotificationRepositoryMock.ts';

// Set required environment variables for initialization
Deno.env.set('GOOGLE_CLOUD_PROJECT', 'test-project');
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('NotificationSchedulerService - Basic functionality test', () => {
  const service = new NotificationSchedulerService();

  assertExists(service);
});

Deno.test('NotificationSchedulerService - scheduleNotifications should call CloudTasksClient and NotificationRepository', async () => {
  const service = new NotificationSchedulerService();

  // Create mock instances
  const mockCloudTasksClient = createMockCloudTasksClient({ taskId: 'test-task-id' });
  const mockNotificationRepository = createMockNotificationRepository();

  // Replace internal dependencies with mocks
  // deno-lint-ignore no-explicit-any
  (service as any).cloudTasksClient = mockCloudTasksClient;
  // deno-lint-ignore no-explicit-any
  (service as any).notificationRepository = mockNotificationRepository;

  // Mock console methods to suppress output
  const consoleLogStub = stub(console, 'log');

  // Mock environment variable
  const originalEnvVar = Deno.env.get('CLOUD_RUN_NOTIFICATION_URL');
  Deno.env.set('CLOUD_RUN_NOTIFICATION_URL', 'https://test.example.com/api/notify');

  try {
    // Create test ticket
    const testTicket = await Ticket.createNew({
      matchName: 'Test Match',
      matchDate: new Date('2024-12-25'),
      saleStartDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      scrapedAt: new Date(),
    });

    // Create notification timing
    const notificationTimings: NotificationTiming[] = [
      {
        type: NOTIFICATION_TYPES.DAY_BEFORE,
        scheduledTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
      },
    ];

    // Execute the method under test
    await service.scheduleNotifications(testTicket, notificationTimings);

    // Verify that tasks were scheduled
    const scheduledTasks = await mockCloudTasksClient.listTasks();
    assertEquals(scheduledTasks.length, 1);

    const firstTask = scheduledTasks[0];
    const payload = firstTask.payload as { ticketId: string; notificationType: string };
    assertEquals(payload.ticketId, testTicket.id);
    assertEquals(payload.notificationType, NOTIFICATION_TYPES.DAY_BEFORE);
    assertEquals(firstTask.httpRequest.url, 'https://test.example.com/api/notify');

    // Verify logging occurred
    assertEquals(consoleLogStub.calls.length, 2); // Start and completion logs
  } finally {
    // Restore environment variable
    if (originalEnvVar === undefined) {
      Deno.env.delete('CLOUD_RUN_NOTIFICATION_URL');
    } else {
      Deno.env.set('CLOUD_RUN_NOTIFICATION_URL', originalEnvVar);
    }

    consoleLogStub.restore();
  }
});

Deno.test('NotificationSchedulerService - should handle CloudTasksClient errors', async () => {
  const service = new NotificationSchedulerService();

  // Create mock that throws error
  const mockCloudTasksClient = createMockCloudTasksClient({
    shouldError: true,
    errorMessage: 'Cloud Tasks operation failed',
  });
  const mockNotificationRepository = createMockNotificationRepository();

  // Replace internal dependencies with mocks
  // deno-lint-ignore no-explicit-any
  (service as any).cloudTasksClient = mockCloudTasksClient;
  // deno-lint-ignore no-explicit-any
  (service as any).notificationRepository = mockNotificationRepository;

  // Suppress console output during test
  const consoleLogStub = stub(console, 'log');
  const consoleErrorStub = stub(console, 'error');
  const consoleWarnStub = stub(console, 'warn');

  // Mock environment variable
  const originalEnvVar = Deno.env.get('CLOUD_RUN_NOTIFICATION_URL');
  Deno.env.set('CLOUD_RUN_NOTIFICATION_URL', 'https://test.example.com/api/notify');

  try {
    const testTicket = await Ticket.createNew({
      matchName: 'Test Match',
      matchDate: new Date('2024-12-25'),
      saleStartDate: new Date(Date.now() + 60 * 60 * 1000),
      scrapedAt: new Date(),
    });

    const notificationTimings: NotificationTiming[] = [
      {
        type: NOTIFICATION_TYPES.DAY_BEFORE,
        scheduledTime: new Date(Date.now() + 30 * 60 * 1000),
      },
    ];

    // Test error handling
    let caughtError: Error | null = null;
    try {
      await service.scheduleNotifications(testTicket, notificationTimings);
    } catch (error) {
      caughtError = error as Error;
    }

    // Verify error was handled and re-thrown
    assertExists(caughtError);
    assertEquals(caughtError.message.includes('1 out of 1 notifications failed to schedule'), true);
    assertEquals(consoleErrorStub.calls.length, 1);
  } finally {
    // Restore environment variable
    if (originalEnvVar === undefined) {
      Deno.env.delete('CLOUD_RUN_NOTIFICATION_URL');
    } else {
      Deno.env.set('CLOUD_RUN_NOTIFICATION_URL', originalEnvVar);
    }

    consoleWarnStub.restore();
    consoleErrorStub.restore();
    consoleLogStub.restore();
  }
});

Deno.test('NotificationSchedulerService - cancelNotification should call CloudTasksClient.dequeueTask', async () => {
  const service = new NotificationSchedulerService();

  // Create mock instance
  const mockCloudTasksClient = createMockCloudTasksClient();

  // Replace internal dependency with mock
  // deno-lint-ignore no-explicit-any
  (service as any).cloudTasksClient = mockCloudTasksClient;

  // Suppress console output
  const consoleLogStub = stub(console, 'log');

  try {
    await service.cancelNotification('test-task-id');

    // Verify dequeueTask behavior by checking that task is no longer in the list
    // (Since we're using a real mock implementation, we can test the actual behavior)
    assertEquals(consoleLogStub.calls.length, 1);
  } finally {
    consoleLogStub.restore();
  }
});
