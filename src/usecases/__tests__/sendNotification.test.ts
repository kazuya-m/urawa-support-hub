import { assert, assertEquals } from 'std/assert/mod.ts';
import {
  type NotificationExecutionInput,
  sendNotification,
  type SendNotificationDeps,
} from '../sendNotification.ts';
import { Notification } from '@/domain/entities/Notification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { NOTIFICATION_TYPES } from '@/domain/config/NotificationConfig.ts';
import type { LineMessage } from '@/infrastructure/clients/LineClient.ts';

const ticket = Ticket.fromExisting({
  id: 'test-ticket-123',
  matchName: 'テスト試合',
  matchDate: new Date('2024-03-15T19:00:00+09:00'),
  homeTeam: 'ホームチーム',
  awayTeam: 'アウェイチーム',
  competition: null,
  venue: 'テスト会場',
  saleStartDate: new Date('2024-03-01T10:00:00+09:00'),
  saleEndDate: null,
  ticketUrl: 'https://example.com/ticket',
  ticketTypes: ['一般'],
  createdAt: new Date(),
  updatedAt: new Date(),
  scrapedAt: new Date(),
  saleStatus: 'before_sale',
  notificationScheduled: false,
});

const input: NotificationExecutionInput = {
  ticketId: 'test-ticket-123',
  notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
};

type StubOptions = {
  ticket?: Ticket | null | Error;
  notifications?: Notification[];
  broadcastError?: Error;
};

function createDeps(options: StubOptions = {}) {
  const calls: string[] = [];
  const saved: Notification[] = [];
  const updated: Notification[] = [];
  const broadcasts: LineMessage[] = [];
  const sleeps: number[] = [];

  const deps: SendNotificationDeps = {
    ticketRepository: {
      findById: (id) => {
        calls.push(`findById:${id}`);
        if (options.ticket instanceof Error) return Promise.reject(options.ticket);
        return Promise.resolve(options.ticket === undefined ? ticket : options.ticket);
      },
    },
    notificationRepository: {
      findByTicketId: (ticketId) => {
        calls.push(`findByTicketId:${ticketId}`);
        return Promise.resolve(options.notifications ?? []);
      },
      save: (notification) => {
        calls.push('save');
        saved.push(notification);
        return Promise.resolve();
      },
      update: (notification) => {
        calls.push(`update:${notification.status}`);
        updated.push(notification);
        return Promise.resolve();
      },
    },
    lineClient: {
      broadcast: (message) => {
        calls.push('broadcast');
        broadcasts.push(message);
        return options.broadcastError ? Promise.reject(options.broadcastError) : Promise.resolve();
      },
    },
    sleep: (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  };

  return { deps, calls, saved, updated, broadcasts, sleeps };
}

function createNotification(status: 'scheduled' | 'sent'): Notification {
  return new Notification({
    id: 'notification-1',
    ticketId: 'test-ticket-123',
    notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    scheduledAt: new Date(),
    sentAt: status === 'sent' ? new Date() : null,
    status,
    errorMessage: null,
    cloudTaskId: null,
    createdAt: new Date(),
    updatedAt: null,
  });
}

async function captureLogs<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; logs: Record<string, unknown>[] }> {
  const lines: string[] = [];
  const originalLog = console.log;
  const envKeys = ['NODE_ENV', 'K_SERVICE', 'K_REVISION'];
  const originalEnv = envKeys.map((key) => [key, Deno.env.get(key)] as const);
  console.log = (line: string) => lines.push(line);
  Deno.env.set('NODE_ENV', 'production');
  Deno.env.delete('K_SERVICE');
  Deno.env.delete('K_REVISION');
  try {
    const result = await fn();
    return { result, logs: lines.map((line) => JSON.parse(line)) };
  } finally {
    console.log = originalLog;
    for (const [key, value] of originalEnv) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

Deno.test('sendNotification - 送信手順', async (t) => {
  await t.step('チケットがなければ error を返し、LINE には送らない', async () => {
    const { deps, calls } = createDeps({ ticket: null });

    const result = await sendNotification(deps, input);

    assertEquals(result.status, 'error');
    assertEquals(result.errorMessage, 'Ticket not found: test-ticket-123');
    assertEquals(calls, ['findById:test-ticket-123']);
  });

  await t.step('通知記録がなければ作成してから送信し、sent に更新する', async () => {
    const { deps, calls, saved, updated, broadcasts } = createDeps();

    const result = await sendNotification(deps, input);

    assertEquals(result.status, 'success');
    assertEquals(calls, [
      'findById:test-ticket-123',
      'findByTicketId:test-ticket-123',
      'save',
      'broadcast',
      'update:sent',
    ]);
    assertEquals(saved[0].ticketId, 'test-ticket-123');
    assertEquals(saved[0].notificationType, NOTIFICATION_TYPES.DAY_BEFORE);
    assertEquals(saved[0].status, 'scheduled');
    assertEquals(updated[0].id, saved[0].id);
    assertEquals(broadcasts.length, 1);
    assertEquals(broadcasts[0].altText, '【チケット販売通知】ホームチーム vs アウェイチーム');
  });

  await t.step('scheduled の通知記録があれば作成せずに送信する', async () => {
    const { deps, calls, updated } = createDeps({
      notifications: [createNotification('scheduled')],
    });

    await sendNotification(deps, input);

    assertEquals(calls, [
      'findById:test-ticket-123',
      'findByTicketId:test-ticket-123',
      'broadcast',
      'update:sent',
    ]);
    assertEquals(updated[0].id, 'notification-1');
  });

  await t.step('送信済みの通知記録があれば何も送らず success を返す', async () => {
    const { deps, calls } = createDeps({
      notifications: [createNotification('sent')],
    });

    const result = await sendNotification(deps, input);

    assertEquals(result.status, 'success');
    assertEquals(calls, ['findById:test-ticket-123', 'findByTicketId:test-ticket-123']);
  });

  await t.step('broadcast が 3 回失敗したら failed に更新し、success を返す', async () => {
    const { deps, calls, updated, sleeps } = createDeps({
      broadcastError: new Error('LINE down'),
    });

    const result = await sendNotification(deps, input);

    assertEquals(result.status, 'success');
    assertEquals(calls, [
      'findById:test-ticket-123',
      'findByTicketId:test-ticket-123',
      'save',
      'broadcast',
      'broadcast',
      'broadcast',
      'update:failed',
    ]);
    assertEquals(updated[0].errorMessage, 'LINE down');
    assertEquals(sleeps, [1000, 2000]);
  });

  await t.step('2 回目の broadcast で成功すれば sent に更新する', async () => {
    const { deps, calls, sleeps } = createDeps();
    let attempts = 0;
    deps.lineClient = {
      broadcast: () => {
        calls.push('broadcast');
        attempts++;
        return attempts === 1 ? Promise.reject(new Error('temporary')) : Promise.resolve();
      },
    };

    const result = await sendNotification(deps, input);

    assertEquals(result.status, 'success');
    assertEquals(calls.slice(-3), ['broadcast', 'broadcast', 'update:sent']);
    assertEquals(sleeps, [1000]);
  });
});

Deno.test('sendNotification - 結果', async (t) => {
  await t.step('成功時は入力と実行時間を返す', async () => {
    const { deps } = createDeps({ notifications: [createNotification('sent')] });

    const result = await sendNotification(deps, input);

    assertEquals(result.status, 'success');
    assertEquals(result.ticketId, 'test-ticket-123');
    assertEquals(result.notificationType, 'day_before');
    assertEquals(result.errorMessage, undefined);
    assert(typeof result.executionDurationMs === 'number');
    assert(result.executionDurationMs >= 0);
  });

  await t.step('DB の失敗は error を返す（例外は投げない）', async () => {
    const { deps } = createDeps({ ticket: new Error('DB down') });

    const result = await sendNotification(deps, input);

    assertEquals(result.status, 'error');
    assertEquals(result.ticketId, 'test-ticket-123');
    assertEquals(result.notificationType, 'day_before');
    assertEquals(result.errorMessage, 'DB down');
  });
});

Deno.test('sendNotification - ログ', async (t) => {
  await t.step('失敗時は ERROR を 2 件出す', async () => {
    const { deps } = createDeps({ ticket: null });

    const { logs } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(logs, [
      {
        severity: 'ERROR',
        message: 'Scheduled notification processing failed',
        jsonPayload: {
          category: 'NOTIFICATION',
          context: { ticketId: 'test-ticket-123', stage: 'scheduled_notification' },
          error: {
            code: 'NOT_003',
            message: 'Ticket not found: test-ticket-123',
            recoverable: false,
          },
        },
      },
      {
        severity: 'ERROR',
        message: 'Scheduled notification failed',
        jsonPayload: {
          category: 'NOTIFICATION',
          context: { ticketId: 'test-ticket-123', stage: 'usecase_error' },
          metadata: { notificationTypeKey: 'day_before' },
          error: { message: 'Ticket not found: test-ticket-123', recoverable: true },
        },
      },
    ]);
  });

  await t.step('broadcast が 3 回失敗したら ERROR を 1 件出す', async () => {
    const { deps, saved } = createDeps({ broadcastError: new Error('LINE down') });

    const { logs } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(logs, [{
      severity: 'ERROR',
      message: 'Notification failed after maximum retries',
      jsonPayload: {
        category: 'NOTIFICATION',
        context: {
          ticketId: 'test-ticket-123',
          notificationId: saved[0].id,
          stage: 'retry_exhausted',
        },
        error: { code: 'NOT_005', message: 'LINE down', recoverable: false },
        metadata: { notificationType: '販売開始前日', maxRetries: 3 },
      },
    }]);
  });

  await t.step('成功時はログを出さない', async () => {
    const { deps } = createDeps();

    const { logs } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(logs, []);
  });
});
