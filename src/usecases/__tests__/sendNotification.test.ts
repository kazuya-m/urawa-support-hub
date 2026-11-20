import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import {
  type NotificationExecutionInput,
  sendNotification,
  type SendNotificationDeps,
} from '../sendNotification.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { NotificationStatus } from '@/domain/entities/Notification.ts';
import { NOTIFICATION_TYPES } from '@/domain/config/NotificationConfig.ts';
import type { BroadcastResult, LineMessage } from '@/infrastructure/clients/LineClient.ts';
import type {
  ClaimedNotification,
  NotificationKey,
} from '@/infrastructure/repositories/NotificationRepository.ts';

const saleStartDate = new Date('2025-03-02T10:00:00+09:00');
const hourBeforeTime = new Date('2025-03-02T09:00:00+09:00');

const ticket = Ticket.fromExisting({
  id: 'test-ticket-123',
  matchName: 'テスト試合',
  matchDate: new Date('2025-03-15T19:00:00+09:00'),
  homeTeam: 'ホームチーム',
  awayTeam: 'アウェイチーム',
  competition: null,
  venue: 'テスト会場',
  saleStartDate,
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
  notificationType: NOTIFICATION_TYPES.HOUR_BEFORE,
};

type StubOptions = {
  ticket?: Ticket | null;
  now?: Date;
  claimed?: ClaimedNotification | null;
  statusByKey?: NotificationStatus | null;
  broadcastResult?: BroadcastResult;
  markSentError?: Error;
  claimError?: Error;
};

function createDeps(options: StubOptions = {}) {
  const calls: string[] = [];
  const claims: { key: NotificationKey; message: LineMessage }[] = [];
  const broadcasts: { message: LineMessage; retryKey: string }[] = [];
  const failures: { id: string; errorMessage: string }[] = [];

  const deps: SendNotificationDeps = {
    ticketRepository: {
      findById: (id) => {
        calls.push(`findById:${id}`);
        return Promise.resolve(options.ticket === undefined ? ticket : options.ticket);
      },
    },
    notificationRepository: {
      claim: (key, message) => {
        calls.push('claim');
        claims.push({ key, message });
        if (options.claimError) return Promise.reject(options.claimError);
        return Promise.resolve(
          options.claimed === undefined ? { id: 'notification-1', message } : options.claimed,
        );
      },
      findStatusByKey: () => {
        calls.push('findStatusByKey');
        return Promise.resolve(options.statusByKey ?? null);
      },
      markSent: (id) => {
        calls.push(`markSent:${id}`);
        return options.markSentError ? Promise.reject(options.markSentError) : Promise.resolve();
      },
      markFailed: (id, errorMessage) => {
        calls.push(`markFailed:${id}`);
        failures.push({ id, errorMessage });
        return Promise.resolve();
      },
    },
    lineClient: {
      broadcastWithRetryKey: (message, retryKey) => {
        calls.push(`broadcast:${retryKey}`);
        broadcasts.push({ message, retryKey });
        return Promise.resolve(options.broadcastResult ?? { kind: 'accepted' });
      },
    },
    now: () => options.now ?? hourBeforeTime,
  };

  return { deps, calls, claims, broadcasts, failures };
}

type LogEntry = { severity: string; message: string };

async function captureLogs<T>(fn: () => Promise<T>): Promise<{ result: T; logs: LogEntry[] }> {
  const lines: string[] = [];
  const originalLog = console.log;
  const originalNodeEnv = Deno.env.get('NODE_ENV');
  console.log = (line: string) => lines.push(line);
  Deno.env.set('NODE_ENV', 'production');
  try {
    const result = await fn();
    const logs: LogEntry[] = lines.map((line) => JSON.parse(line));
    return { result, logs };
  } finally {
    console.log = originalLog;
    if (originalNodeEnv === undefined) Deno.env.delete('NODE_ENV');
    else Deno.env.set('NODE_ENV', originalNodeEnv);
  }
}

Deno.test('sendNotification', async (t) => {
  await t.step('確保して送信し、sent を記録する', async () => {
    const { deps, calls, claims } = createDeps();

    const { result } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'sent', notificationId: 'notification-1' });
    assertEquals(calls, [
      'findById:test-ticket-123',
      'claim',
      'broadcast:notification-1',
      'markSent:notification-1',
    ]);
    assertEquals(claims[0].key, {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.HOUR_BEFORE,
      notificationTime: hourBeforeTime,
    });
  });

  await t.step('sent の記録に失敗しても broadcast は 1 回で、sent を返す', async () => {
    const { deps, calls } = createDeps({ markSentError: new Error('db down') });

    const { result, logs } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'sent', notificationId: 'notification-1' });
    assertEquals(calls.filter((call) => call.startsWith('broadcast')).length, 1);
    assertEquals(logs.map((log) => log.severity), ['ERROR']);
  });

  await t.step('同じタスクが 2 回届いても broadcast は 1 回', async () => {
    const first = createDeps();
    const second = createDeps({ claimed: null, statusByKey: 'sent' });

    const { result: firstResult } = await captureLogs(() => sendNotification(first.deps, input));
    const { result: secondResult } = await captureLogs(() => sendNotification(second.deps, input));

    assertEquals(firstResult.kind, 'sent');
    assertEquals(secondResult, { kind: 'skipped', reason: 'already_sent' });
    assertEquals(first.broadcasts.length + second.broadcasts.length, 1);
  });

  await t.step('他の処理が確保中なら送らずに retry を返す', async () => {
    const { deps, broadcasts } = createDeps({ claimed: null, statusByKey: 'sending' });

    const { result } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'retry', reason: 'claimed_by_another' });
    assertEquals(broadcasts.length, 0);
  });

  await t.step('再確保時は保存済みの本文で送る', async () => {
    const storedMessage: LineMessage = { type: 'text', text: '初回の本文' };
    const { deps, broadcasts } = createDeps({
      claimed: { id: 'notification-1', message: storedMessage },
    });

    await captureLogs(() => sendNotification(deps, input));

    assertEquals(broadcasts, [{ message: storedMessage, retryKey: 'notification-1' }]);
  });

  await t.step('LINE の 409（受理済み）は sent を記録する', async () => {
    const { deps, calls } = createDeps({ broadcastResult: { kind: 'already_accepted' } });

    const { result } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'sent', notificationId: 'notification-1' });
    assertEquals(calls.at(-1), 'markSent:notification-1');
  });

  await t.step('LINE の 500・タイムアウトは failed を記録して retry を返す', async () => {
    const { deps, calls, failures } = createDeps({
      broadcastResult: { kind: 'retryable', detail: '500 down' },
    });

    const { result } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'retry', reason: 'line_unavailable' });
    assertEquals(calls.at(-1), 'markFailed:notification-1');
    assertEquals(failures, [{ id: 'notification-1', errorMessage: '500 down' }]);
  });

  for (const status of [400, 429]) {
    await t.step(`LINE の ${status} は failed を記録し、再試行せず ERROR を出す`, async () => {
      const { deps, failures } = createDeps({
        broadcastResult: { kind: 'rejected', status, detail: `${status} rejected` },
      });

      const { result, logs } = await captureLogs(() => sendNotification(deps, input));

      assertEquals(result, { kind: 'rejected', notificationId: 'notification-1', status });
      assertEquals(failures, [{ id: 'notification-1', errorMessage: `${status} rejected` }]);
      assertEquals(logs.map((log) => log.severity), ['ERROR']);
    });
  }

  await t.step('チケットがなければ送らずに skipped を返す', async () => {
    const { deps, calls } = createDeps({ ticket: null });

    const { result } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'skipped', reason: 'ticket_not_found' });
    assertEquals(calls, ['findById:test-ticket-123']);
  });

  await t.step('販売開始日がなければ送らずに skipped を返す', async () => {
    const { deps, calls } = createDeps({
      ticket: Ticket.fromExisting({ ...ticket.toPlainObject(), saleStartDate: null }),
    });

    const { result } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'skipped', reason: 'no_sale_start_date' });
    assertEquals(calls, ['findById:test-ticket-123']);
  });

  await t.step('送信時刻と合わない（販売日の変更後の旧タスク）なら送らない', async () => {
    const { deps, calls } = createDeps({ now: new Date('2025-03-01T09:00:00+09:00') });

    const { result } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'skipped', reason: 'outside_send_window' });
    assertEquals(calls, ['findById:test-ticket-123']);
  });

  await t.step('販売開始を過ぎていたら送らない', async () => {
    const { deps, calls } = createDeps({ now: saleStartDate });

    const { result } = await captureLogs(() => sendNotification(deps, input));

    assertEquals(result, { kind: 'skipped', reason: 'outside_send_window' });
    assertEquals(calls, ['findById:test-ticket-123']);
  });

  await t.step('DB の失敗は例外のまま投げる（controller が 5xx にする）', async () => {
    const { deps, broadcasts } = createDeps({ claimError: new Error('db down') });

    await assertRejects(() => sendNotification(deps, input), Error, 'db down');
    assertEquals(broadcasts.length, 0);
  });
});
