import { assertEquals } from 'std/assert/mod.ts';
import { handleSendNotification } from '../sendNotificationController.ts';
import type { SendNotificationDeps } from '@/usecases/sendNotification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { BroadcastResult } from '@/infrastructure/clients/LineClient.ts';

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
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
  });

  const notificationDeps = (
    options: {
      ticket?: Ticket | null;
      broadcastResult?: BroadcastResult;
      claimedByAnother?: boolean;
    } = {},
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
        claim: (_key, message) => {
          calls.push('claim');
          return Promise.resolve(
            options.claimedByAnother ? null : { id: 'n-1', message, claimedAt: 'claimed-at' },
          );
        },
        findStatusByKey: () => Promise.resolve(options.claimedByAnother ? 'sending' : null),
        markSent: () => {
          calls.push('markSent');
          return Promise.resolve();
        },
        markFailed: () => {
          calls.push('markFailed');
          return Promise.resolve();
        },
      },
      lineClient: {
        broadcastWithRetryKey: () => {
          calls.push('broadcast');
          return Promise.resolve(options.broadcastResult ?? { kind: 'accepted' });
        },
      },
      now: () => new Date('2024-02-29T20:00:00+09:00'),
    };
    return { deps, calls };
  };

  const validBody = JSON.stringify({ ticketId: 't-1', notificationType: 'day_before' });

  await t.step('送信できたら 200', async () => {
    const { deps, calls } = notificationDeps();
    const { result: response } = await captureLogs(() =>
      handleSendNotification(post(validBody), deps)
    );
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.status, 'success');
    assertEquals(body.ticketId, 't-1');
    assertEquals(body.notificationType, 'day_before');
    assertEquals(body.outcome, { kind: 'sent', notificationId: 'n-1' });
    assertEquals(calls, ['findById:t-1', 'claim', 'broadcast', 'markSent']);
  });

  await t.step('LINE が 500 なら 500（Cloud Tasks に再試行させる）', async () => {
    const { deps, calls } = notificationDeps({
      broadcastResult: { kind: 'retryable', detail: '500 down' },
    });
    const { result: response } = await captureLogs(() =>
      handleSendNotification(post(validBody), deps)
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Notification will be retried');
    assertEquals(body.details.reason, 'line_unavailable');
    assertEquals(calls.at(-1), 'markFailed');
  });

  await t.step('他の処理が確保中なら 500', async () => {
    const { deps } = notificationDeps({ claimedByAnother: true });
    const { result: response } = await captureLogs(() =>
      handleSendNotification(post(validBody), deps)
    );

    assertEquals(response.status, 500);
  });

  for (const status of [400, 429]) {
    await t.step(`LINE が ${status} なら failed を記録して 200`, async () => {
      const { deps, calls } = notificationDeps({
        broadcastResult: { kind: 'rejected', status, detail: `${status}` },
      });
      const { result: response } = await captureLogs(() =>
        handleSendNotification(post(validBody), deps)
      );
      const body = await response.json();

      assertEquals(response.status, 200);
      assertEquals(body.outcome, { kind: 'rejected', notificationId: 'n-1', status });
      assertEquals(calls.at(-1), 'markFailed');
    });
  }

  await t.step('チケットがなければ送らずに 200', async () => {
    const { deps, calls } = notificationDeps({ ticket: null });
    const { result: response } = await captureLogs(() =>
      handleSendNotification(post(validBody), deps)
    );
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.outcome, { kind: 'skipped', reason: 'ticket_not_found' });
    assertEquals(calls, ['findById:t-1']);
  });

  await t.step('送信時刻と合わなければ送らずに 200', async () => {
    const { deps, calls } = notificationDeps({
      ticket: Ticket.fromExisting({
        ...ticket.toPlainObject(),
        saleStartDate: new Date('2024-03-08T10:00:00+09:00'),
      }),
    });
    const { result: response } = await captureLogs(() =>
      handleSendNotification(post(validBody), deps)
    );
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.outcome, { kind: 'skipped', reason: 'outside_send_window' });
    assertEquals(calls, ['findById:t-1']);
  });

  await t.step('DB の失敗は 500（Cloud Tasks に再試行させる）', async () => {
    const { deps } = notificationDeps();
    const failingDeps: SendNotificationDeps = {
      ...deps,
      notificationRepository: {
        ...deps.notificationRepository,
        claim: () => Promise.reject(new Error('db down')),
      },
    };
    const { result: response } = await captureLogs(() =>
      handleSendNotification(post(validBody), failingDeps)
    );

    assertEquals(response.status, 500);
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
    assertEquals(body.details, 'Invalid notificationType: "invalid_notification_type"');
    assertEquals(calls, []);
  });

  await t.step('payload の notificationTime を照合に使う', async () => {
    const { deps, calls } = notificationDeps();
    const { result: response } = await captureLogs(() =>
      handleSendNotification(
        post(JSON.stringify({
          ticketId: 't-1',
          notificationType: 'day_before',
          notificationTime: '2024-02-28T11:00:00.000Z',
        })),
        deps,
      )
    );
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.outcome, { kind: 'skipped', reason: 'notification_time_mismatch' });
    assertEquals(calls, ['findById:t-1']);
  });

  await t.step('notificationTime が一致すれば送る', async () => {
    const { deps } = notificationDeps();
    const { result: response } = await captureLogs(() =>
      handleSendNotification(
        post(JSON.stringify({
          ticketId: 't-1',
          notificationType: 'day_before',
          notificationTime: '2024-02-29T11:00:00.000Z',
        })),
        deps,
      )
    );
    const body = await response.json();

    assertEquals(body.outcome, { kind: 'sent', notificationId: 'n-1' });
  });

  await t.step('notificationTime が日時でなければ 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleSendNotification(
      post(
        JSON.stringify({ ticketId: 't-1', notificationType: 'day_before', notificationTime: 1 }),
      ),
      deps,
    );
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.details, 'Invalid notificationTime: 1');
    assertEquals(calls, []);
  });

  await t.step('notificationType が文字列でなければ 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleSendNotification(
      post(JSON.stringify({ ticketId: 'a', notificationType: { toString: 1 } })),
      deps,
    );
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.details, 'Invalid notificationType: {"toString":1}');
    assertEquals(calls, []);
  });

  await t.step('notificationType が Object.prototype のプロパティ名なら 400', async () => {
    const { deps, calls } = notificationDeps();
    const response = await handleSendNotification(
      post(JSON.stringify({ ticketId: 'a', notificationType: 'toString' })),
      deps,
    );

    assertEquals(response.status, 400);
    assertEquals(calls, []);
  });
});
