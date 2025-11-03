import { assertEquals, assertThrows } from 'std/assert/mod.ts';
import { Notification } from '../Notification.ts';

Deno.test('Notification - 正常な通知履歴作成', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  const notification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: now,
    updatedAt: null,
  });

  assertEquals(notification.id, 'test-id');
  assertEquals(notification.ticketId, 'ticket-123');
  assertEquals(notification.notificationType, 'day_before');
  assertEquals(notification.status, 'scheduled');
});

Deno.test('Notification - バリデーション: 空のID', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  assertThrows(
    () =>
      new Notification({
        id: '',
        ticketId: 'ticket-123',
        notificationType: 'day_before',
        scheduledAt: scheduledTime,
        sentAt: null,
        status: 'scheduled',
        errorMessage: null,
        cloudTaskId: null,
        createdAt: now,
        updatedAt: null,
      }),
    Error,
    'Notification ID is required',
  );
});

Deno.test('Notification - バリデーション: 不正な通知タイプ', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  assertThrows(
    () =>
      new Notification({
        id: 'test-id',
        ticketId: 'ticket-123',
        notificationType: 'invalid_type' as 'day_before',
        scheduledAt: scheduledTime,
        sentAt: null,
        status: 'scheduled',
        errorMessage: null,
        cloudTaskId: null,
        createdAt: now,
        updatedAt: null,
      }),
    Error,
    'Invalid notification type',
  );
});

Deno.test('Notification - バリデーション: sent状態でsentAtなし', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  assertThrows(
    () =>
      new Notification({
        id: 'test-id',
        ticketId: 'ticket-123',
        notificationType: 'day_before',
        scheduledAt: scheduledTime,
        sentAt: null,
        status: 'sent',
        errorMessage: null,
        cloudTaskId: null,
        createdAt: now,
        updatedAt: null,
      }),
    Error,
    'Sent notifications must have sentAt timestamp',
  );
});

Deno.test('Notification - バリデーション: failed状態でエラーメッセージなし', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  assertThrows(
    () =>
      new Notification({
        id: 'test-id',
        ticketId: 'ticket-123',
        notificationType: 'day_before',
        scheduledAt: scheduledTime,
        sentAt: now,
        status: 'failed',
        errorMessage: null,
        cloudTaskId: null,
        createdAt: now,
        updatedAt: null,
      }),
    Error,
    'Failed notifications must have error message',
  );
});

Deno.test('Notification - 送信可能性判定', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 3 * 60 * 1000);

  const notification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: now,
    updatedAt: null,
  });

  assertEquals(notification.canBeSent(now), true);

  const afterScheduled = new Date(scheduledTime.getTime() + 1000);
  assertEquals(notification.canBeSent(afterScheduled), true);

  const tooEarly = new Date(scheduledTime.getTime() - 10 * 60 * 1000);
  assertEquals(notification.canBeSent(tooEarly), false);
});

Deno.test('Notification - 期限切れ判定', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const notification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    updatedAt: null,
  });

  assertEquals(notification.isExpired(now), true);

  const sentNotification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: scheduledTime,
    status: 'sent',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    updatedAt: null,
  });

  assertEquals(sentNotification.isExpired(now), false);
});

Deno.test('Notification - リトライ可能性判定', () => {
  const now = new Date();
  const failedTime = new Date(now.getTime() - 10 * 60 * 1000); // 10分前

  const failedNotification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: new Date(now.getTime() + 60 * 60 * 1000), // まだ期限内
    sentAt: failedTime,
    status: 'failed',
    errorMessage: 'Network error',
    cloudTaskId: null,
    createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    updatedAt: null,
  });

  // 失敗から10分経過しているのでリトライ可能
  assertEquals(failedNotification.canRetry(now), true);

  // 失敗から3分しか経過していない場合
  const recentFailed = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: new Date(now.getTime() + 60 * 60 * 1000),
    sentAt: new Date(now.getTime() - 3 * 60 * 1000),
    status: 'failed',
    errorMessage: 'Network error',
    cloudTaskId: null,
    createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    updatedAt: null,
  });

  assertEquals(recentFailed.canRetry(now), false);
});

Deno.test('Notification - 送信完了マーク', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  const notification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: now,
    updatedAt: null,
  });

  const sentTime = new Date();
  const sentNotification = notification.markAsSent(sentTime);

  assertEquals(sentNotification.status, 'sent');
  assertEquals(sentNotification.sentAt, sentTime);
  assertEquals(sentNotification.errorMessage, null);
});

Deno.test('Notification - 送信失敗マーク', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  const notification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: now,
    updatedAt: null,
  });

  const failedTime = new Date();
  const errorMessage = 'API Rate limit exceeded';
  const failedNotification = notification.markAsFailed(errorMessage, failedTime);

  assertEquals(failedNotification.status, 'failed');
  assertEquals(failedNotification.sentAt, failedTime);
  assertEquals(failedNotification.errorMessage, errorMessage);
});

Deno.test('Notification - 通知タイプ表示名', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  const dayBeforeNotification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: now,
    updatedAt: null,
  });

  assertEquals(dayBeforeNotification.getNotificationTypeDisplayName(), '販売開始前日');

  const hourBeforeNotification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'hour_before',
    scheduledAt: scheduledTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: now,
    updatedAt: null,
  });

  assertEquals(hourBeforeNotification.getNotificationTypeDisplayName(), '販売開始1時間前');
});

Deno.test('Notification - キャンセルマーク（sentAtは変更されない）', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);

  const notification = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: null,
    status: 'scheduled',
    errorMessage: null,
    cloudTaskId: null,
    createdAt: now,
    updatedAt: null,
  });

  const cancelledTime = new Date();
  const reason = 'Cancelled due to manual intervention';
  const cancelledNotification = notification.markAsCancelled(reason, cancelledTime);

  assertEquals(cancelledNotification.status, 'cancelled');
  assertEquals(cancelledNotification.errorMessage, reason);
  assertEquals(cancelledNotification.sentAt, null); // sentAtは設定されない
});

Deno.test('Notification - キャンセルマーク（既存のsentAtは保持される）', () => {
  const now = new Date();
  const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000);
  const existingSentAt = new Date(now.getTime() - 30 * 60 * 1000);

  const notificationWithSentAt = new Notification({
    id: 'test-id',
    ticketId: 'ticket-123',
    notificationType: 'day_before',
    scheduledAt: scheduledTime,
    sentAt: existingSentAt,
    status: 'failed',
    errorMessage: 'Previous error',
    cloudTaskId: null,
    createdAt: now,
    updatedAt: null,
  });

  const cancelledTime = new Date();
  const reason = 'Cancelled due to manual intervention';
  const cancelledNotification = notificationWithSentAt.markAsCancelled(reason, cancelledTime);

  assertEquals(cancelledNotification.status, 'cancelled');
  assertEquals(cancelledNotification.errorMessage, reason);
  assertEquals(cancelledNotification.sentAt, existingSentAt); // 既存のsentAtは保持される
});
