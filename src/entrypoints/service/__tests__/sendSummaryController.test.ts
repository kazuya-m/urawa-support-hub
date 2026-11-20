import { assertEquals } from 'std/assert/mod.ts';
import { handleSendSummary } from '../sendSummaryController.ts';
import { DatabaseError, ErrorCodes } from '@/shared/errors/index.ts';
import type { SendSummaryDeps } from '@/usecases/sendSummary.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';

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

Deno.test('ticket-summary', async (t) => {
  const upcoming = Ticket.fromExisting({
    id: 'ticket-1',
    matchName: '浦和レッズ vs FC東京',
    matchDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    homeTeam: null,
    awayTeam: null,
    competition: null,
    venue: null,
    saleStartDate: null,
    saleEndDate: null,
    saleStatus: 'on_sale',
    ticketTypes: [],
    ticketUrl: null,
    notificationScheduled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    scrapedAt: new Date(),
  });

  const summaryDeps = (
    options: { findError?: Error; broadcastError?: Error } = {},
  ): SendSummaryDeps => ({
    ticketRepository: {
      findByStatusIn: () =>
        options.findError ? Promise.reject(options.findError) : Promise.resolve([upcoming]),
    },
    lineClient: {
      broadcast: () =>
        options.broadcastError ? Promise.reject(options.broadcastError) : Promise.resolve(),
    },
  });

  await t.step('成功時は 200', async () => {
    const { result: response } = await captureLogs(() => handleSendSummary(summaryDeps()));
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(Object.keys(body), ['status', 'message', 'timestamp']);
    assertEquals(body.status, 'success');
    assertEquals(body.message, 'Ticket summary processed successfully');
  });

  await t.step('LINE の失敗は想定外エラーとして 500（メッセージは 2 重に包まれる）', async () => {
    const { result: response, logs } = await captureLogs(() =>
      handleSendSummary(summaryDeps({ broadcastError: new Error('LINE down') }))
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Internal server error during ticket summary processing');
    assertEquals(body.details, {
      errorType: 'UnknownError',
      errorMessage:
        'Ticket summary notification failed: Ticket summary notification failed: LINE down',
    });

    assertEquals(logs.map((log) => [log.severity, log.message]), [
      ['ERROR', 'Ticket summary notification failed'],
      ['ERROR', 'Ticket summary notification failed'],
      ['ERROR', 'Unexpected error in ticket summary processing'],
    ]);
    assertEquals(logs[2].jsonPayload, {
      category: 'NOTIFICATION',
      context: { stage: 'TicketSummaryController' },
      error: {
        message:
          'Ticket summary notification failed: Ticket summary notification failed: LINE down',
        recoverable: false,
      },
    });
  });

  await t.step('DB の AppError も素の Error に包まれ、想定外エラーとして応答する', async () => {
    const { result: response, logs } = await captureLogs(() =>
      handleSendSummary(summaryDeps({
        findError: new DatabaseError(
          'TicketRepository',
          'findByStatusIn',
          'x',
          ErrorCodes.DB_FETCH_ERROR,
        ),
      }))
    );
    const body = await response.json();

    assertEquals(response.status, 500);
    assertEquals(body.error, 'Internal server error during ticket summary processing');
    assertEquals(body.details, {
      errorType: 'UnknownError',
      errorMessage: 'Ticket summary notification failed: [TicketRepository.findByStatusIn] x',
    });
    assertEquals(logs.at(-1)?.severity, 'ERROR');
  });
});
