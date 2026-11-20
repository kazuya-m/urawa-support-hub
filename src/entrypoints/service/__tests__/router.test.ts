import { assertEquals, assertRejects } from 'std/assert/mod.ts';
import { handleRequest, routeKey, type Routes } from '../router.ts';

const routes: Routes = {
  [routeKey('POST', '/api/collect-tickets')]: () => new Response('collect', { status: 201 }),
  [routeKey('GET', '/health')]: () => Promise.resolve(new Response('health')),
  [routeKey('POST', '/api/send-notification')]: () => {
    throw new Error('deps creation failed');
  },
};

Deno.test('handleRequest - ルーティング', async (t) => {
  await t.step('メソッドとパスが一致するハンドラの応答を返す', async () => {
    const response = await handleRequest(
      new Request('http://localhost:8080/api/collect-tickets', { method: 'POST' }),
      routes,
    );

    assertEquals(response.status, 201);
    assertEquals(await response.text(), 'collect');
  });

  await t.step('同期・非同期どちらのハンドラも扱う', async () => {
    const response = await handleRequest(
      new Request('http://localhost:8080/health', { method: 'GET' }),
      routes,
    );

    assertEquals(await response.text(), 'health');
  });

  await t.step('クエリ文字列はパスの照合に含めない', async () => {
    const response = await handleRequest(
      new Request('http://localhost:8080/health?probe=1', { method: 'GET' }),
      routes,
    );

    assertEquals(await response.text(), 'health');
  });

  await t.step('未知のパスは 404', async () => {
    const response = await handleRequest(
      new Request('http://localhost:8080/api/unknown', { method: 'GET' }),
      routes,
    );
    const body = await response.json();

    assertEquals(response.status, 404);
    assertEquals(response.headers.get('Content-Type'), 'application/json');
    assertEquals(Object.keys(body), ['error', 'message', 'timestamp']);
    assertEquals(body.error, 'Not Found');
    assertEquals(body.message, 'GET /api/unknown is not supported');
  });

  await t.step('メソッドが違えば 404', async () => {
    const response = await handleRequest(
      new Request('http://localhost:8080/api/collect-tickets', { method: 'GET' }),
      routes,
    );

    assertEquals(response.status, 404);
    await response.body?.cancel();
  });

  await t.step('ハンドラが投げた例外は包まずにそのまま投げる', async () => {
    await assertRejects(
      () =>
        handleRequest(
          new Request('http://localhost:8080/api/send-notification', { method: 'POST' }),
          routes,
        ),
      Error,
      'deps creation failed',
    );
  });
});
