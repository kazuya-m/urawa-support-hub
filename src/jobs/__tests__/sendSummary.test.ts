import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import { sendSummary, type SendSummaryDeps } from '../sendSummary.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import type { LineMessage } from '@/infrastructure/clients/LineClient.ts';

const NOW = new Date('2025-10-01T00:00:00Z');

/** broadcast したメッセージに試合名が含まれるか */
const mentions = (message: LineMessage, matchName: string) =>
  JSON.stringify(message).includes(matchName);
const DAY = 24 * 60 * 60 * 1000;

/**
 * テスト用のチケットを作る（指定しない項目は固定値）
 */
function createTestTicket(
  overrides: { id: string; matchName: string; matchDate: Date },
): Ticket {
  // homeTeam・awayTeam があるとメッセージは「ホーム vs アウェイ」になるので、試合名を出すために null にする
  return Ticket.fromExisting({
    homeTeam: null,
    awayTeam: null,
    competition: 'J1リーグ',
    venue: 'さいたまスタジアム2002',
    saleStartDate: new Date('2025-09-25T10:00:00+09:00'),
    saleEndDate: new Date('2025-10-01T12:00:00+09:00'),
    saleStatus: 'on_sale',
    ticketTypes: ['一般', 'ホームゲート指定席'],
    ticketUrl: 'https://example.com/tickets/test-ticket-1',
    notificationScheduled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
    ...overrides,
  });
}

type StubOptions = {
  /** findByStatusIn が返すチケット。Error を渡すと reject する */
  tickets?: Ticket[] | Error;
  /** broadcast を失敗させるエラー */
  broadcastError?: Error;
};

/**
 * sendSummary の依存をインラインスタブで用意し、呼び出しを記録する
 */
function createDeps(options: StubOptions = {}) {
  const findByStatusInCalls: string[][] = [];
  const broadcasts: LineMessage[] = [];

  const deps: SendSummaryDeps = {
    ticketRepository: {
      findByStatusIn: (statuses) => {
        findByStatusInCalls.push(statuses);
        return options.tickets instanceof Error
          ? Promise.reject(options.tickets)
          : Promise.resolve(options.tickets ?? []);
      },
    },
    lineClient: {
      broadcast: (message) => {
        broadcasts.push(message);
        return options.broadcastError ? Promise.reject(options.broadcastError) : Promise.resolve();
      },
    },
  };

  return { deps, findByStatusInCalls, broadcasts };
}

/**
 * 処理中の CloudLogger の出力（console.log の JSON）を捕まえる
 * stack を出さないよう production にし、Cloud Run のラベルが付かないよう K_SERVICE を消す
 */
async function captureLogs(fn: () => Promise<unknown>): Promise<Record<string, unknown>[]> {
  const lines: string[] = [];
  const originalLog = console.log;
  const envKeys = ['NODE_ENV', 'K_SERVICE', 'K_REVISION'];
  const originalEnv = envKeys.map((key) => [key, Deno.env.get(key)] as const);
  console.log = (line: string) => lines.push(line);
  Deno.env.set('NODE_ENV', 'production');
  Deno.env.delete('K_SERVICE');
  Deno.env.delete('K_REVISION');
  try {
    await fn().catch(() => {});
  } finally {
    console.log = originalLog;
    for (const [key, value] of originalEnv) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
  return lines.map((line) => JSON.parse(line));
}

Deno.test('sendSummary', async (t) => {
  await t.step('販売中・販売予定のチケットを取得し、一覧を 1 回 broadcast する', async () => {
    const ticket1 = createTestTicket({
      id: 'ticket-1',
      matchName: '浦和レッズ vs FC東京',
      matchDate: new Date(NOW.getTime() + 7 * DAY),
    });
    const ticket2 = createTestTicket({
      id: 'ticket-2',
      matchName: '浦和レッズ vs 横浜F・マリノス',
      matchDate: new Date(NOW.getTime() + 8 * DAY),
    });
    const { deps, findByStatusInCalls, broadcasts } = createDeps({ tickets: [ticket1, ticket2] });

    await sendSummary(deps, NOW);

    assertEquals(findByStatusInCalls, [['on_sale', 'before_sale']]);
    assertEquals(broadcasts.length, 1);
    assertEquals(
      broadcasts[0].altText,
      '🎫 チケット一覧 (販売中2件、販売予定0件)',
    );
    assertEquals(mentions(broadcasts[0], '浦和レッズ vs FC東京'), true);
    assertEquals(mentions(broadcasts[0], '浦和レッズ vs 横浜F・マリノス'), true);
  });

  await t.step('試合日が過去のチケットは除く（現在時刻ちょうどは含む）', async () => {
    const past = createTestTicket({
      id: 'past-ticket',
      matchName: '浦和レッズ vs 名古屋グランパス',
      matchDate: new Date(NOW.getTime() - 1),
    });
    const justNow = createTestTicket({
      id: 'just-now-ticket',
      matchName: '浦和レッズ vs FC東京',
      matchDate: NOW,
    });
    const { deps, broadcasts } = createDeps({ tickets: [past, justNow] });

    await sendSummary(deps, NOW);

    assertEquals(broadcasts.length, 1);
    assertEquals(broadcasts[0].altText, '🎫 チケット一覧 (販売中1件、販売予定0件)');
    assertEquals(mentions(broadcasts[0], '浦和レッズ vs FC東京'), true);
    assertEquals(mentions(broadcasts[0], '名古屋グランパス'), false);
  });

  await t.step('試合日がすべて過去なら送らない', async () => {
    const { deps, broadcasts } = createDeps({
      tickets: [
        createTestTicket({
          id: 'past-ticket-1',
          matchName: '浦和レッズ vs 名古屋グランパス',
          matchDate: new Date(NOW.getTime() - DAY),
        }),
        createTestTicket({
          id: 'past-ticket-2',
          matchName: '浦和レッズ vs セレッソ大阪',
          matchDate: new Date(NOW.getTime() - 7 * DAY),
        }),
      ],
    });

    await sendSummary(deps, NOW);

    assertEquals(broadcasts.length, 0);
  });

  await t.step('チケットがなければ送らない', async () => {
    const { deps, broadcasts } = createDeps({ tickets: [] });

    await sendSummary(deps, NOW);

    assertEquals(broadcasts.length, 0);
  });

  await t.step('取得の失敗は包み直して投げ、送らない', async () => {
    const { deps, broadcasts } = createDeps({ tickets: new Error('Database error') });

    await assertRejects(
      () => sendSummary(deps, NOW),
      Error,
      'Ticket summary notification failed: Database error',
    );
    assertEquals(broadcasts.length, 0);
  });

  await t.step('送信の失敗は 2 重に包み直して投げる', async () => {
    const { deps, broadcasts } = createDeps({
      tickets: [
        createTestTicket({
          id: 'ticket-1',
          matchName: '浦和レッズ vs FC東京',
          matchDate: new Date(NOW.getTime() + 7 * DAY),
        }),
      ],
      broadcastError: new Error('LINE down'),
    });

    const error = await assertRejects(() => sendSummary(deps, NOW), Error);

    assertEquals(
      error.message,
      'Ticket summary notification failed: Ticket summary notification failed: LINE down',
    );
    assertEquals(broadcasts.length, 1);
  });
});

Deno.test('sendSummary - ログ', async (t) => {
  const upcoming = createTestTicket({
    id: 'ticket-1',
    matchName: '浦和レッズ vs FC東京',
    matchDate: new Date(NOW.getTime() + 7 * DAY),
  });

  await t.step('成功時は送信と完了の INFO を出す', async () => {
    const { deps } = createDeps({ tickets: [upcoming] });

    const logs = await captureLogs(() => sendSummary(deps, NOW));

    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['INFO', 'Ticket summary notification sent successfully'],
      ['INFO', 'Ticket summary sent successfully'],
    ]);
    assertEquals(logs[0].jsonPayload, {
      category: 'NOTIFICATION',
      context: { stage: 'ticket_summary_sent' },
      metadata: { ticketCount: 1 },
    });
  });

  await t.step('対象がないときはスキップの INFO を出す', async () => {
    const { deps } = createDeps({ tickets: [] });

    const logs = await captureLogs(() => sendSummary(deps, NOW));

    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['INFO', 'No upcoming tickets found, skipping LINE notification'],
    ]);
  });

  await t.step('送信の失敗では ERROR を 2 件出す', async () => {
    const { deps } = createDeps({
      tickets: [upcoming],
      broadcastError: new Error('LINE down'),
    });

    const logs = await captureLogs(() => sendSummary(deps, NOW));

    assertEquals(logs, [
      {
        severity: 'ERROR',
        message: 'Ticket summary notification failed',
        jsonPayload: {
          category: 'NOTIFICATION',
          context: { stage: 'ticket_summary_error' },
          error: { code: 'NOT_004', message: 'LINE down', recoverable: false },
        },
      },
      {
        severity: 'ERROR',
        message: 'Ticket summary notification failed',
        jsonPayload: {
          category: 'NOTIFICATION',
          context: { stage: 'usecase_error' },
          error: {
            code: 'NOT_004',
            message: 'Ticket summary notification failed: LINE down',
            recoverable: false,
          },
        },
      },
    ]);
  });
});
