import { assertEquals, assertRejects, assertThrows } from 'std/assert/mod.ts';
import { stub } from 'std/testing/mock.ts';
import { LineClient, LineClientConfig, LineMessage } from '../LineClient.ts';

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

  await t.step('should send push message successfully', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(new Response('{}', { status: 200 })),
    );

    try {
      const client = new LineClient(mockConfig);
      const message: LineMessage = {
        type: 'text',
        text: 'Test push message',
      };
      const userId = 'test-user-id';

      await client.push(userId, message);

      assertEquals(fetchStub.calls.length, 1);
      assertEquals(fetchStub.calls[0].args[0], 'https://api.line.me/v2/bot/message/push');

      const requestInit = fetchStub.calls[0].args[1] as RequestInit;
      assertEquals(requestInit.method, 'POST');

      const body = JSON.parse(requestInit.body as string);
      assertEquals(body.to, userId);
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

  await t.step('should handle push message API error', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () =>
        Promise.resolve(
          new Response('Error message', { status: 500, statusText: 'Internal Server Error' }),
        ),
    );

    try {
      const client = new LineClient(mockConfig);
      const message: LineMessage = {
        type: 'text',
        text: 'Test message',
      };

      await assertRejects(
        () => client.push('user-id', message),
        Error,
        'LINE push message failed: 500 Internal Server Error - Error message',
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
});
