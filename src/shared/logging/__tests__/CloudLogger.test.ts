import { assertEquals } from 'std/assert/mod.ts';
import { CloudLogger } from '../CloudLogger.ts';
import { LogCategory } from '../types.ts';

type Env = { NODE_ENV?: string; K_SERVICE?: string; K_REVISION?: string };

/**
 * 指定した環境変数で fn を実行し、console.log に渡された文字列をそのまま返す
 * 環境変数と console.log は必ず元に戻す
 */
function captureOutput(env: Env, fn: () => void): string[] {
  const keys = ['NODE_ENV', 'K_SERVICE', 'K_REVISION'] as const;
  const original = Object.fromEntries(keys.map((key) => [key, Deno.env.get(key)]));
  const originalLog = console.log;
  const lines: string[] = [];
  try {
    for (const key of keys) {
      const value = env[key];
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
    console.log = (line: string) => lines.push(line);
    fn();
  } finally {
    console.log = originalLog;
    for (const key of keys) {
      const value = original[key];
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
  return lines;
}

const production: Env = { NODE_ENV: 'production' };

Deno.test('CloudLogger - 出力する JSON の形', async (t) => {
  await t.step('ペイロードなしでは severity と message だけを出す', () => {
    const lines = captureOutput(production, () => CloudLogger.info('hello'));

    assertEquals(lines, ['{"severity":"INFO","message":"hello"}']);
  });

  await t.step('ペイロードを jsonPayload にそのまま入れる（キー順も保つ）', () => {
    const lines = captureOutput(production, () =>
      CloudLogger.error('failed', {
        category: LogCategory.CLOUD_TASKS,
        context: { taskId: 't-1', stage: 'enqueue_error' },
        metadata: { queueName: 'notifications' },
        metrics: {
          totalProcessed: 2,
          successCount: 1,
          failureCount: 1,
          processingTimeMs: 5,
        },
        error: { code: 'CT_001', message: 'boom', recoverable: true },
      }));

    assertEquals(lines, [
      '{"severity":"ERROR","message":"failed","jsonPayload":{"category":"CLOUD_TASKS",' +
      '"context":{"taskId":"t-1","stage":"enqueue_error"},' +
      '"metadata":{"queueName":"notifications"},' +
      '"metrics":{"totalProcessed":2,"successCount":1,"failureCount":1,"processingTimeMs":5},' +
      '"error":{"code":"CT_001","message":"boom","recoverable":true}}}',
    ]);
  });

  await t.step('値が undefined のキーは出さず、型にない余分なキーはそのまま出す', () => {
    const extra = { grpcCode: 7 };
    const lines = captureOutput(production, () =>
      CloudLogger.error('failed', {
        category: LogCategory.NOTIFICATION,
        context: undefined,
        error: { message: 'boom', stack: undefined, ...extra },
      }));

    assertEquals(lines, [
      '{"severity":"ERROR","message":"failed","jsonPayload":{"category":"NOTIFICATION",' +
      '"error":{"message":"boom","grpcCode":7}}}',
    ]);
  });
});

Deno.test('CloudLogger - Cloud Run のラベル', async (t) => {
  await t.step('K_SERVICE と K_REVISION があればラベルを最後に付ける', () => {
    const lines = captureOutput(
      { ...production, K_SERVICE: 'svc', K_REVISION: 'svc-001' },
      () => CloudLogger.info('hello', { category: LogCategory.SYSTEM }),
    );

    assertEquals(lines, [
      '{"severity":"INFO","message":"hello","jsonPayload":{"category":"SYSTEM"},' +
      '"logging.googleapis.com/labels":{"service":"svc","revision":"svc-001"}}',
    ]);
  });

  await t.step('K_SERVICE だけなら revision は空文字', () => {
    const lines = captureOutput(
      { ...production, K_SERVICE: 'svc' },
      () => CloudLogger.info('hello'),
    );

    assertEquals(lines, [
      '{"severity":"INFO","message":"hello",' +
      '"logging.googleapis.com/labels":{"service":"svc","revision":""}}',
    ]);
  });

  await t.step('K_SERVICE が空文字ならラベルを付けない', () => {
    const lines = captureOutput(
      { ...production, K_SERVICE: '', K_REVISION: 'svc-001' },
      () => CloudLogger.info('hello'),
    );

    assertEquals(lines, ['{"severity":"INFO","message":"hello"}']);
  });
});

Deno.test('CloudLogger - メソッドと severity', () => {
  const lines = captureOutput({ NODE_ENV: 'development' }, () => {
    CloudLogger.debug('m');
    CloudLogger.info('m');
    CloudLogger.warning('m');
    CloudLogger.error('m');
    CloudLogger.critical('m');
  });

  assertEquals(
    lines.map((line) => JSON.parse(line).severity),
    ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'],
  );
});

Deno.test('CloudLogger - NODE_ENV による DEBUG の抑制', async (t) => {
  const logAll = () => {
    CloudLogger.debug('m');
    CloudLogger.critical('m');
  };
  const severities = (env: Env) =>
    captureOutput(env, logAll).map((line) => JSON.parse(line).severity);

  await t.step('NODE_ENV が未設定なら production 扱いで DEBUG を出さない', () => {
    assertEquals(severities({}), ['CRITICAL']);
  });

  await t.step('production では DEBUG を出さず、CRITICAL は出す', () => {
    assertEquals(severities(production), ['CRITICAL']);
  });

  await t.step('development では DEBUG も出す', () => {
    assertEquals(severities({ NODE_ENV: 'development' }), ['DEBUG', 'CRITICAL']);
  });
});
