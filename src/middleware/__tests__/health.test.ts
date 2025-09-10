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
