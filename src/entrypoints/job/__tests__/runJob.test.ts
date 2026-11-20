import { assertEquals } from 'std/assert/mod.ts';
import { runJob } from '../runJob.ts';

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

const run = { name: 'collect-tickets', executionId: 'collect-tickets-abc12', taskAttempt: '0' };

Deno.test('runJob', async (t) => {
  await t.step('成功すれば 0 を返し、INFO を 1 件記録する', async () => {
    let executed = 0;
    const { result, logs } = await captureLogs(() =>
      runJob(run, () => {
        executed++;
        return Promise.resolve({ ticketsFound: 3 });
      })
    );

    assertEquals(result, 0);
    assertEquals(executed, 1);
    assertEquals(logs.length, 1);
    assertEquals(logs[0].severity, 'INFO');
    assertEquals(logs[0].message, 'Job collect-tickets completed');

    const payload = logs[0].jsonPayload!;
    assertEquals(payload.category, 'SYSTEM');
    const metadata = payload.metadata as Record<string, unknown>;
    assertEquals(Object.keys(metadata), [
      'jobName',
      'executionId',
      'taskAttempt',
      'processingTimeMs',
    ]);
    assertEquals(metadata.jobName, 'collect-tickets');
    assertEquals(metadata.executionId, 'collect-tickets-abc12');
    assertEquals(metadata.taskAttempt, '0');
    assertEquals(typeof metadata.processingTimeMs, 'number');
  });

  await t.step('失敗すれば 1 を返し、ERROR を 1 件記録する', async () => {
    const { result, logs } = await captureLogs(() =>
      runJob(run, () => Promise.reject(new Error('LINE down')))
    );

    assertEquals(result, 1);
    assertEquals(logs.length, 1);
    assertEquals(logs[0].severity, 'ERROR');
    assertEquals(logs[0].message, 'Job collect-tickets failed');

    const payload = logs[0].jsonPayload!;
    assertEquals(payload.category, 'SYSTEM');
    assertEquals(
      (payload.metadata as Record<string, unknown>).executionId,
      'collect-tickets-abc12',
    );
    assertEquals(payload.error, { message: 'LINE down', recoverable: false });
  });

  await t.step('execute が同期で投げても 1 を返す', async () => {
    const { result, logs } = await captureLogs(() =>
      runJob(run, () => {
        throw new Error(
          'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
        );
      })
    );

    assertEquals(result, 1);
    assertEquals(logs[0].severity, 'ERROR');
  });

  await t.step('Cloud Run ジョブの外では実行 ID・試行回数を出さない', async () => {
    const { logs } = await captureLogs(() =>
      runJob({ name: 'send-summary' }, () => Promise.resolve())
    );

    const metadata = logs[0].jsonPayload!.metadata as Record<string, unknown>;
    assertEquals(logs[0].message, 'Job send-summary completed');
    assertEquals(metadata.executionId, undefined);
    assertEquals(metadata.taskAttempt, undefined);
  });
});
