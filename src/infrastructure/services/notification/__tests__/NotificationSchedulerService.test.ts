import { assertEquals, assertExists } from 'std/assert/mod.ts';
import { stub } from 'std/testing/mock.ts';
import { NotificationSchedulerService } from '../NotificationSchedulerService.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { NOTIFICATION_TYPES } from '@/domain/config/NotificationConfig.ts';
import { NotificationTiming } from '@/domain/services/NotificationSchedulingService.ts';
import type {
  CloudTasksClient,
  EnqueueTaskParams,
} from '@/infrastructure/clients/CloudTasksClient.ts';
import type { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import type { Notification } from '@/domain/entities/Notification.ts';

/** 登録済みタスク（本番の CloudTasksClient には無い、確認用の形） */
type Task = {
  name: string;
  scheduleTime: Date;
  payload: unknown;
  httpRequest: { url: string; httpMethod: string };
};

/**
 * 登録したタスクを listTasks で確認できる CloudTasksClient のスタブ
 */
function createCloudTasksClientStub(
  options: { shouldError?: boolean; errorMessage?: string; taskId?: string } = {},
) {
  const {
    shouldError = false,
    errorMessage = 'Mock Cloud Tasks error',
    taskId = 'mock-task-id',
  } = options;
  const scheduledTasks = new Map<string, EnqueueTaskParams>();

  const stub = {
    enqueueTask(params: EnqueueTaskParams): Promise<string> {
      if (shouldError) return Promise.reject(new Error(errorMessage));
      const actualTaskId = params.taskId || taskId;
      scheduledTasks.set(actualTaskId, params);
      return Promise.resolve(actualTaskId);
    },
    dequeueTask(taskId: string): Promise<void> {
      if (shouldError) return Promise.reject(new Error(errorMessage));
      scheduledTasks.delete(taskId);
      return Promise.resolve();
    },
  } satisfies Partial<CloudTasksClient>;

  const listTasks = (): Promise<Task[]> =>
    Promise.resolve(
      Array.from(scheduledTasks.entries()).map(([id, params]) => ({
        name: id,
        scheduleTime: params.scheduledTime,
        payload: params.payload,
        httpRequest: { url: params.targetUrl, httpMethod: params.httpMethod || 'POST' },
      })),
    );

  return Object.assign(stub as unknown as CloudTasksClient, { listTasks });
}

/**
 * 保存した通知をメモリに持つ NotificationRepository のスタブ
 */
function createNotificationRepositoryStub(): NotificationRepository {
  const notifications: Notification[] = [];
  const stub = {
    findById: (id: string) => Promise.resolve(notifications.find((n) => n.id === id) || null),
    findByTicketId: (ticketId: string) =>
      Promise.resolve(notifications.filter((n) => n.ticketId === ticketId)),
    save: (notification: Notification) => {
      notifications.push(notification);
      return Promise.resolve();
    },
    update: (notification: Notification) => {
      const index = notifications.findIndex((n) => n.id === notification.id);
      if (index >= 0) notifications[index] = notification;
      return Promise.resolve();
    },
  } satisfies Partial<NotificationRepository>;
  return stub as unknown as NotificationRepository;
}

// Set required environment variables for initialization
Deno.env.set('GOOGLE_CLOUD_PROJECT', 'test-project');
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('NotificationSchedulerService - Basic functionality test', () => {
  const mockCloudTasksClient = createCloudTasksClientStub({ taskId: 'test-task-id' });
  const mockNotificationRepository = createNotificationRepositoryStub();
  const service = new NotificationSchedulerService(
    mockCloudTasksClient,
    mockNotificationRepository,
  );

  assertExists(service);
});

Deno.test('NotificationSchedulerService - scheduleNotifications should call CloudTasksClient and NotificationRepository', async () => {
  // Create mock instances
  const mockCloudTasksClient = createCloudTasksClientStub({ taskId: 'test-task-id' });
  const mockNotificationRepository = createNotificationRepositoryStub();

  // Create service with injected dependencies
  const service = new NotificationSchedulerService(
    mockCloudTasksClient,
    mockNotificationRepository,
  );

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
      homeTeam: null,
      awayTeam: null,
      competition: null,
      saleStartDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      saleEndDate: null,
      venue: null,
      ticketTypes: null,
      ticketUrl: null,
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
      notificationScheduled: false,
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

    // 実装でのconsole.log呼び出しがないことを確認（エラー時のconsole.error/warnのみ許可）
    assertEquals(consoleLogStub.calls.length, 0);
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
  // Create mock that throws error
  const mockCloudTasksClient = createCloudTasksClientStub({
    shouldError: true,
    errorMessage: 'Cloud Tasks operation failed',
  });
  const mockNotificationRepository = createNotificationRepositoryStub();

  // Create service with injected dependencies
  const service = new NotificationSchedulerService(
    mockCloudTasksClient,
    mockNotificationRepository,
  );

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
      homeTeam: null,
      awayTeam: null,
      competition: null,
      saleStartDate: new Date(Date.now() + 60 * 60 * 1000),
      saleEndDate: null,
      venue: null,
      ticketTypes: null,
      ticketUrl: null,
      scrapedAt: new Date(),
      saleStatus: 'before_sale',
      notificationScheduled: false,
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
    assertEquals(consoleErrorStub.calls.length, 0);
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
  // Create mock instance
  const mockCloudTasksClient = createCloudTasksClientStub();
  const mockNotificationRepository = createNotificationRepositoryStub();

  // Create service with injected dependencies
  const service = new NotificationSchedulerService(
    mockCloudTasksClient,
    mockNotificationRepository,
  );

  // Suppress console output
  const consoleLogStub = stub(console, 'log');

  try {
    await service.cancelNotification('test-task-id');

    // 実装でのconsole.log呼び出しがないことを確認（エラー時のconsole.errorのみ許可）
    assertEquals(consoleLogStub.calls.length, 0);
  } finally {
    consoleLogStub.restore();
  }
});
