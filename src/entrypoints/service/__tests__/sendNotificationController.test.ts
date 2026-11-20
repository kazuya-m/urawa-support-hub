import { assertEquals } from 'std/assert/mod.ts';
import { handleSendNotification } from '../sendNotificationController.ts';
import type { SendNotificationDeps } from '@/usecases/sendNotification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { Notification } from '@/domain/entities/Notification.ts';

type LogEntry = {
  severity: string;
  message: string;
  jsonPayload?: Record<string, unknown>;
};

async function captureLogs<T>(fn: () => Promise<T>): Promise<{ result: T; logs: LogEntry[] }> {
  const lines: string[] = [];
  const originalLog = console.log;
  const originalNodeEnv = Deno.env.get('NODE_ENV');
  console.log = (line: string) => lines.push(line);
  Deno.env.set('NODE_ENV', 'production');
  try {
    const result = await fn();
    return { result, logs: lines.map((line) => JSON.parse(line) as LogEntry) };
  } finally {
    console.log = originalLog;
    if (originalNodeEnv === undefined) Deno.env.delete('NODE_ENV');
    else Deno.env.set('NODE_ENV', originalNodeEnv);
  }
}

const post = (body?: string) =>
  new Request('http://localhost:8080/api/send-notification', { method: 'POST', body });

Deno.test('send-notification', async (t) => {
  const ticket = Ticket.fromExisting({
    id: 't-1',
    matchName: 'テスト試合',
    matchDate: new Date('2024-03-15T19:00:00+09:00'),
    homeTeam: null,
    awayTeam: null,
    competition: null,
    venue: null,
    saleStartDate: new Date('2024-03-01T10:00:00+09:00'),
    saleEndDate: null,
    saleStatus: 'before_sale',
    ticketTypes: [],
    ticketUrl: null,
    notificationScheduled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
  });

  const notificationDeps = (
    options: { ticket?: Ticket | null; broadcastError?: Error } = {},
  ) => {
    const calls: string[] = [];
    const deps: SendNotificationDeps = {
      ticketRepository: {
        findById: (id) => {
          calls.push(`findById:${id}`);
          return Promise.resolve(options.ticket === undefined ? ticket : options.ticket);
        },
      },
      notificationRepository: {
        findByTicketId: () => Promise.resolve<Notification[]>([]),
        save: () => Promise.resolve(),
        update: (notification) => {
          calls.push(`update:${notification.status}`);
          return Promise.resolve();
        },
      },
      lineClient: {
        broadcast: () => {
          calls.push('broadcast');
          return options.broadcastError
            ? Promise.reject(options.broadcastError)
            : Promise.resolve();
        },
      },
      sleep: () => Promise.resolve(),
    };
    return { deps, calls };
  };

  const validBody = JSON.stringify({ ticketId: 't-1', notificationType: 'day_before' });

  await t.step('成功時は 200', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleSendNotification(post(validBody), deps);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(Object.keys(body), [
      'status',
      'message',
      'ticketId',
      'notificationType',
      'executionTimeMs',
      'timestamp',
    ]);
    assertEquals(body.status, 'success');
    assertEquals(body.message, 'Notification sent successfully');
    assertEquals(body.ticketId, 't-1');
    assertEquals(body.notificationType, 'day_before');
    assertEquals(typeof body.executionTimeMs, 'number');
    assertEquals(calls, ['findById:t-1', 'broadcast', 'update:sent']);
  });

  await t.step('LINE が 3 回失敗しても 200（failed を記録する）', async () => {
    const { deps, calls } = notificationDeps({ broadcastError: new Error('LINE down') });
    const { result: response, logs } = await captureLogs(() =>
      handleSendNotification(post(validBody), deps)
    );
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.message, 'Notification sent successfully');
    assertEquals(calls.at(-1), 'update:failed');
    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['ERROR', 'Notification failed after maximum retries'],
    ]);
  });

  await t.step('チケットがなければ 500 と ERROR ログ 2 件', async () => {
    const { deps } = notificationDeps({ ticket: null });
    const { result: response, logs } = await captureLogs(() =>
      handleSendNotification(post(validBody), deps)
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Notification processing failed');
    assertEquals(Object.keys(body.details), [
      'ticketId',
      'notificationType',
      'errorMessage',
      'executionTimeMs',
    ]);
    assertEquals(body.details.ticketId, 't-1');
    assertEquals(body.details.notificationType, 'day_before');
    assertEquals(body.details.errorMessage, 'Ticket not found: t-1');
    assertEquals(typeof body.details.executionTimeMs, 'number');
    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['ERROR', 'Scheduled notification processing failed'],
      ['ERROR', 'Scheduled notification failed'],
    ]);
  });

  await t.step('body が JSON でなければ 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleSendNotification(post('not json'), deps);
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.error, 'Bad Request');
    assertEquals(body.details, 'Invalid request body format');
    assertEquals(calls, []);
  });

  await t.step('ticketId が空なら 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleSendNotification(
      post(JSON.stringify({ ticketId: '', notificationType: 'invalid_type' })),
      deps,
    );
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.error, 'Bad Request');
    assertEquals(body.details, 'ticketId is required and must be a string');
    assertEquals(calls, []);
  });

  await t.step('notificationType が不正なら 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleSendNotification(
      post(JSON.stringify({ ticketId: 't-1', notificationType: 'invalid_notification_type' })),
      deps,
    );
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.details, 'Invalid notificationType: invalid_notification_type');
    assertEquals(calls, []);
  });

  await t.step('検証中の想定外エラー（細工した body）は 500 と CRITICAL ログ', async () => {
    const { deps, calls } = notificationDeps();
    const { result: response, logs } = await captureLogs(() =>
      handleSendNotification(
        post(JSON.stringify({ ticketId: 'a', notificationType: { toString: 1 } })),
        deps,
      )
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Internal Server Error');
    assertEquals(body.details, 'Cannot convert object to primitive value');
    assertEquals(calls, []);

    assertEquals(logs.length, 1);
    assertEquals(logs[0].severity, 'CRITICAL');
    assertEquals(logs[0].message, 'Unexpected error in NotificationController');
    assertEquals(logs[0].jsonPayload, {
      category: 'NOTIFICATION',
      error: { message: 'Cannot convert object to primitive value', recoverable: false },
    });
  });
});
