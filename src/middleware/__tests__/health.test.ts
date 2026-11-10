import { assertEquals } from 'std/assert/mod.ts';
import { handleHealthCheck } from '../health.ts';

function setTestEnv() {
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
}

function clearTestEnv() {
  Deno.env.delete('SUPABASE_URL');
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
}

Deno.test('health middleware - successful health check', async () => {
  setTestEnv();

  try {
    const response = handleHealthCheck();

    assertEquals(response.status, 200);

    const body = JSON.parse(await response.text());
    assertEquals(body.status, 'healthy');
    assertEquals(body.checks.environment, 'ok');
    assertEquals(body.checks.supabase, 'ok');
  } finally {
    clearTestEnv();
  }
});

Deno.test('health middleware - missing environment variables', async () => {
  clearTestEnv();

  try {
    const response = handleHealthCheck();

    assertEquals(response.status, 503);

    const body = JSON.parse(await response.text());
    assertEquals(body.status, 'unhealthy');
  } finally {
    clearTestEnv();
  }
});

Deno.test('health middleware - partial environment setup', async () => {
  clearTestEnv();
  Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');

  try {
    const response = handleHealthCheck();

    assertEquals(response.status, 503);

    const body = JSON.parse(await response.text());
    assertEquals(body.status, 'unhealthy');
  } finally {
    clearTestEnv();
  }
});

Deno.test('health middleware - 環境変数の組み合わせごとの応答', async (t) => {
  const cases: Array<{
    name: string;
    url?: string;
    key?: string;
    status: number;
    environment: string;
    supabase: string;
  }> = [
    {
      name: '両方なし',
      status: 503,
      environment: 'error: Required environment variable SUPABASE_URL is not set',
      supabase: 'error: Supabase environment variables not configured',
    },
    {
      name: 'URL のみ',
      url: 'https://test.supabase.co',
      status: 503,
      environment: 'error: Required environment variable SUPABASE_SERVICE_ROLE_KEY is not set',
      supabase: 'error: Supabase environment variables not configured',
    },
    {
      name: 'KEY のみ',
      key: 'test-service-role-key',
      status: 503,
      environment: 'error: Required environment variable SUPABASE_URL is not set',
      supabase: 'error: Supabase environment variables not configured',
    },
    {
      name: 'URL が空文字',
      url: '',
      key: 'test-service-role-key',
      status: 503,
      environment: 'error: Required environment variable SUPABASE_URL is not set',
      supabase: 'error: Supabase environment variables not configured',
    },
    {
      name: '両方あり',
      url: 'https://test.supabase.co',
      key: 'test-service-role-key',
      status: 200,
      environment: 'ok',
      supabase: 'ok',
    },
  ];

  for (const c of cases) {
    await t.step(c.name, async () => {
      clearTestEnv();
      if (c.url !== undefined) Deno.env.set('SUPABASE_URL', c.url);
      if (c.key) Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', c.key);
      try {
        const response = handleHealthCheck();
        const body = await response.json();

        assertEquals(response.status, c.status);
        assertEquals(body.checks, { environment: c.environment, supabase: c.supabase });
      } finally {
        clearTestEnv();
      }
    });
  }
});
