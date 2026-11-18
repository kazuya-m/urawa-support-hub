import { assertEquals, assertStrictEquals, assertThrows } from 'std/assert/mod.ts';
import { getSupabaseAdminClient, resetSupabaseAdminClientForTest } from '../supabase.ts';

const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'NODE_ENV'];

/**
 * 環境変数と console.warn を差し替え、共有クライアントを捨ててから実行する
 */
function withEnv(fn: (warnings: unknown[][]) => void): void {
  const original = ENV_KEYS.map((key) => [key, Deno.env.get(key)] as const);
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => warnings.push(args);
  resetSupabaseAdminClientForTest();
  try {
    fn(warnings);
  } finally {
    console.warn = originalWarn;
    resetSupabaseAdminClientForTest();
    for (const [key, value] of original) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

Deno.test('getSupabaseAdminClient', async (t) => {
  await t.step('同じインスタンスを返し、非 production の警告は 1 回だけ出す', () => {
    withEnv((warnings) => {
      Deno.env.set('SUPABASE_URL', 'http://127.0.0.1:54321');
      Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
      Deno.env.set('NODE_ENV', 'test');

      const first = getSupabaseAdminClient();
      const second = getSupabaseAdminClient();

      assertStrictEquals(first, second);
      assertEquals(warnings, [['WARNING: Using admin client with RLS bypass']]);
    });
  });

  await t.step('環境変数がなければ投げ、設定した後の呼び出しでは作れる', () => {
    withEnv(() => {
      Deno.env.delete('SUPABASE_URL');
      Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');

      assertThrows(
        () => getSupabaseAdminClient(),
        Error,
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
      );

      Deno.env.set('SUPABASE_URL', 'http://127.0.0.1:54321');
      Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
      const client = getSupabaseAdminClient();
      assertStrictEquals(getSupabaseAdminClient(), client);
    });
  });
});
