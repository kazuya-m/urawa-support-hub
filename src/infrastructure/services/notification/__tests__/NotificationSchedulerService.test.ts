import { assertEquals, assertMatch, assertRejects } from 'std/assert/mod.ts';
import { NotificationSchedulerService } from '../NotificationSchedulerService.ts';
import { NOTIFICATION_TYPES } from '@/domain/config/NotificationConfig.ts';
import type { UpcomingNotification } from '@/domain/notification.ts';
import type {
  CloudTasksClient,
  EnqueueTaskParams,
} from '@/infrastructure/clients/CloudTasksClient.ts';

function createCloudTasksStub() {
  const queued = new Map<string, EnqueueTaskParams>();
  const requests: EnqueueTaskParams[] = [];
  const client: Pick<CloudTasksClient, 'enqueueTask'> = {
    enqueueTask: (params) => {
      requests.push(params);
      if (queued.has(params.taskId)) return Promise.resolve('already_exists');
      queued.set(params.taskId, params);
      return Promise.resolve('created');
    },
  };
  return { client, queued, requests };
}

const notification: UpcomingNotification = {
  ticketId: '6f1c2a3b-1234-5abc-8def-0123456789ab',
  notificationType: NOTIFICATION_TYPES.HOUR_BEFORE,
  notificationTime: new Date('2025-03-02T09:00:00+09:00'),
};
const targetUrl = 'https://example.run.app/api/send-notification';

Deno.test('NotificationSchedulerService.scheduleNotification', async (t) => {
  await t.step('チケット ID・通知タイプ・送信時刻（エポック秒）からタスク名を作る', async () => {
    const { client, requests } = createCloudTasksStub();

    const result = await new NotificationSchedulerService(client, targetUrl)
      .scheduleNotification(notification);

    assertEquals(result, 'created');
    assertEquals(
      requests[0].taskId,
      '6f1c2a3b-1234-5abc-8def-0123456789ab-hour_before-1740873600',
    );
    assertMatch(requests[0].taskId, /^[A-Za-z0-9_-]+$/);
    assertEquals(requests[0].scheduledTime, notification.notificationTime);
    assertEquals(requests[0].targetUrl, targetUrl);
  });

  await t.step('payload に送信時刻を入れる', async () => {
    const { client, requests } = createCloudTasksStub();

    await new NotificationSchedulerService(client, targetUrl).scheduleNotification(notification);

    assertEquals(requests[0].payload, {
      ticketId: notification.ticketId,
      notificationType: 'hour_before',
      notificationTime: '2025-03-02T00:00:00.000Z',
    });
  });

  await t.step('同じ通知を 2 日続けて登録しても 1 タスク', async () => {
    const { client, queued } = createCloudTasksStub();
    const service = new NotificationSchedulerService(client, targetUrl);

    const first = await service.scheduleNotification(notification);
    const second = await service.scheduleNotification({
      ...notification,
      notificationTime: new Date(notification.notificationTime),
    });

    assertEquals([first, second], ['created', 'already_exists']);
    assertEquals(queued.size, 1);
  });

  await t.step('販売日が変わると別のタスク名になる', async () => {
    const { client, queued } = createCloudTasksStub();
    const service = new NotificationSchedulerService(client, targetUrl);

    await service.scheduleNotification(notification);
    await service.scheduleNotification({
      ...notification,
      notificationTime: new Date('2025-03-09T09:00:00+09:00'),
    });

    assertEquals(queued.size, 2);
  });

  await t.step('送信先の URL がなければ失敗する', async () => {
    const { client, requests } = createCloudTasksStub();

    await assertRejects(
      () => new NotificationSchedulerService(client, '').scheduleNotification(notification),
      Error,
      'CLOUD_RUN_NOTIFICATION_URL',
    );
    assertEquals(requests.length, 0);
  });
});
