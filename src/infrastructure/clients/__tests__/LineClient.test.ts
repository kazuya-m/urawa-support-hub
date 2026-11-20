import { assertEquals, assertRejects, assertThrows } from 'std/assert/mod.ts';
import { stub } from 'std/testing/mock.ts';
import { LineClient, LineMessage } from '../LineClient.ts';
import type { LineClientConfig } from '@/config/app-config.ts';

Deno.test('LineClient', async (t) => {
  const mockConfig: LineClientConfig = {
    channelAccessToken: 'test-channel-access-token',
  };

  await t.step('should create LineClient with valid config', () => {
    const client = new LineClient(mockConfig);
    assertEquals(typeof client, 'object');
  });

  await t.step('should throw error when channelAccessToken is missing', () => {
    const invalidConfig: LineClientConfig = {
      channelAccessToken: '',
    };

    assertThrows(
      () => new LineClient(invalidConfig),
      Error,
      'LINE Channel Access Token is required',
    );
  });

  await t.step('should send broadcast message successfully', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(new Response('{}', { status: 200 })),
    );

    try {
      const client = new LineClient(mockConfig);
      const message: LineMessage = {
        type: 'text',
        text: 'Test message',
      };

      await client.broadcast(message);

      assertEquals(fetchStub.calls.length, 1);
      assertEquals(fetchStub.calls[0].args[0], 'https://api.line.me/v2/bot/message/broadcast');

      const requestInit = fetchStub.calls[0].args[1] as RequestInit;
      assertEquals(requestInit.method, 'POST');
      assertEquals(requestInit.headers, {
        'Authorization': 'Bearer test-channel-access-token',
        'Content-Type': 'application/json',
      });

      const body = JSON.parse(requestInit.body as string);
      assertEquals(body.messages[0], message);
    } finally {
      fetchStub.restore();
    }
  });

  await t.step('should handle broadcast API error', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () =>
        Promise.resolve(new Response('Error message', { status: 400, statusText: 'Bad Request' })),
    );

    try {
      const client = new LineClient(mockConfig);
      const message: LineMessage = {
        type: 'text',
        text: 'Test message',
      };

      await assertRejects(
        () => client.broadcast(message),
        Error,
        'LINE broadcast failed: 400 Bad Request - Error message',
      );
    } finally {
      fetchStub.restore();
    }
  });

  await t.step('should handle network error gracefully', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(new Response('Network error', { status: 500 })),
    );

    try {
      const client = new LineClient(mockConfig);
      const message: LineMessage = {
        type: 'text',
        text: 'Test message',
      };

      await assertRejects(
        () => client.broadcast(message),
        Error,
        'LINE broadcast failed',
      );
    } finally {
      fetchStub.restore();
    }
  });
  await t.step('broadcastWithRetryKey: X-Line-Retry-Key を付けて送る', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(new Response('{}', { status: 200 })),
    );

    try {
      const client = new LineClient(mockConfig);
      const message: LineMessage = { type: 'text', text: 'Test message' };

      const result = await client.broadcastWithRetryKey(message, 'retry-key-1');

      assertEquals(result, { kind: 'accepted' });
      const requestInit = fetchStub.calls[0].args[1] as RequestInit;
      assertEquals(requestInit.headers, {
        'Authorization': 'Bearer test-channel-access-token',
        'Content-Type': 'application/json',
        'X-Line-Retry-Key': 'retry-key-1',
      });
      assertEquals(JSON.parse(requestInit.body as string), { messages: [message] });
    } finally {
      fetchStub.restore();
    }
  });

  const classify = async (response: () => Promise<Response>) => {
    const fetchStub = stub(globalThis, 'fetch', response);
    try {
      return await new LineClient(mockConfig).broadcastWithRetryKey(
        { type: 'text', text: 'Test message' },
        'retry-key-1',
      );
    } finally {
      fetchStub.restore();
    }
  };

  await t.step('broadcastWithRetryKey: 409 は受理済み', async () => {
    assertEquals(
      await classify(() => Promise.resolve(new Response('conflict', { status: 409 }))),
      { kind: 'already_accepted' },
    );
  });

  await t.step('broadcastWithRetryKey: 400・429 は再試行しない失敗', async () => {
    assertEquals(
      await classify(() => Promise.resolve(new Response('bad', { status: 400 }))),
      { kind: 'rejected', status: 400, detail: '400 bad' },
    );
    assertEquals(
      await classify(() => Promise.resolve(new Response('limit', { status: 429 }))),
      { kind: 'rejected', status: 429, detail: '429 limit' },
    );
  });

  await t.step('broadcastWithRetryKey: 500 と通信エラーは再試行対象', async () => {
    assertEquals(
      await classify(() => Promise.resolve(new Response('down', { status: 500 }))),
      { kind: 'retryable', detail: '500 down' },
    );
    assertEquals(
      await classify(() => Promise.reject(new TypeError('connection reset'))),
      { kind: 'retryable', detail: 'connection reset' },
    );
  });
});
