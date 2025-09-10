import { assertEquals, assertRejects, assertThrows } from 'std/assert/mod.ts';
import { stub } from 'std/testing/mock.ts';
import { DiscordClient, DiscordClientConfig, DiscordWebhookPayload } from '../DiscordClient.ts';

Deno.test('DiscordClient', async (t) => {
  const mockConfig: DiscordClientConfig = {
    webhookUrl: 'https://discord.com/api/webhooks/123/abc',
  };

  await t.step('should create DiscordClient with valid config', () => {
    const client = new DiscordClient(mockConfig);
    assertEquals(typeof client, 'object');
  });

  await t.step('should throw error when webhookUrl is missing', () => {
    const invalidConfig: DiscordClientConfig = {
      webhookUrl: '',
    };

    assertThrows(
      () => new DiscordClient(invalidConfig),
      Error,
      'Discord webhook URL is required',
    );
  });

  await t.step('should send webhook message successfully', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(new Response(null, { status: 204 })),
    );

    try {
      const client = new DiscordClient(mockConfig);
      const payload: DiscordWebhookPayload = {
        content: 'Test message',
        embeds: [{
          title: 'Test Embed',
          description: 'Test description',
          color: 0xFF0000,
        }],
      };

      await client.sendWebhook(payload);

      assertEquals(fetchStub.calls.length, 1);
      assertEquals(fetchStub.calls[0].args[0], mockConfig.webhookUrl);

      const requestInit = fetchStub.calls[0].args[1] as RequestInit;
      assertEquals(requestInit.method, 'POST');
      assertEquals(requestInit.headers, {
        'Content-Type': 'application/json',
      });

      const body = JSON.parse(requestInit.body as string);
      assertEquals(body.content, 'Test message');
      assertEquals(body.embeds[0].title, 'Test Embed');
    } finally {
      fetchStub.restore();
    }
  });

  await t.step('should send webhook with embed only', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(new Response(null, { status: 204 })),
    );

    try {
      const client = new DiscordClient(mockConfig);
      const payload: DiscordWebhookPayload = {
        embeds: [{
          title: 'Error Alert',
          description: 'Something went wrong',
          color: 0xDC143C,
          fields: [
            {
              name: 'Error Type',
              value: 'Network Error',
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        }],
      };

      await client.sendWebhook(payload);

      assertEquals(fetchStub.calls.length, 1);

      const body = JSON.parse((fetchStub.calls[0].args[1] as RequestInit).body as string);
      assertEquals(body.embeds[0].title, 'Error Alert');
      assertEquals(body.embeds[0].fields[0].name, 'Error Type');
    } finally {
      fetchStub.restore();
    }
  });

  await t.step('should handle webhook API error', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () =>
        Promise.resolve(new Response('Bad Request', { status: 400, statusText: 'Bad Request' })),
    );

    try {
      const client = new DiscordClient(mockConfig);
      const payload: DiscordWebhookPayload = {
        content: 'Test message',
      };

      await assertRejects(
        () => client.sendWebhook(payload),
        Error,
        'Discord webhook failed: 400 Bad Request - Bad Request',
      );
    } finally {
      fetchStub.restore();
    }
  });

  await t.step('should handle network error gracefully', async () => {
    const fetchStub = stub(
      globalThis,
      'fetch',
      () =>
        Promise.resolve(
          new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }),
        ),
    );

    try {
      const client = new DiscordClient(mockConfig);
      const payload: DiscordWebhookPayload = {
        content: 'Test message',
      };

      await assertRejects(
        () => client.sendWebhook(payload),
        Error,
        'Discord webhook failed: 500 Internal Server Error - Server Error',
      );
    } finally {
      fetchStub.restore();
    }
  });

  await t.step('should handle fetch response text error', async () => {
    const mockResponse = new Response('', { status: 400 });
    // Mock text() to throw an error
    const _originalText = mockResponse.text.bind(mockResponse);
    mockResponse.text = () => Promise.reject(new Error('Text parsing failed'));

    const fetchStub = stub(globalThis, 'fetch', () => Promise.resolve(mockResponse));

    try {
      const client = new DiscordClient(mockConfig);
      const payload: DiscordWebhookPayload = {
        content: 'Test message',
      };

      await assertRejects(
        () => client.sendWebhook(payload),
        Error,
        'Discord webhook failed: 400  - Unknown error',
      );
    } finally {
      fetchStub.restore();
    }
  });
});
