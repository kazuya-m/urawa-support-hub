import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * セキュアなSupabaseクライアント設定（RLS適用）
 */
export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required',
    );
  }

  // 本番環境では自動リフレッシュを有効にする
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * 管理者用Supabaseクライアント（緊急時のみ）
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
    );
  }

  if (Deno.env.get('NODE_ENV') !== 'production') {
    console.warn('WARNING: Using admin client with RLS bypass');
  }

  // Service Roleは長期間有効なので自動リフレッシュ不要
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * グローバルSupabaseクライアントインスタンス（シングルトンパターン）
 * 複数回の初期化を避けるためキャッシュする
 */
let globalSupabaseClient: SupabaseClient | null = null;

/**
 * 共有Supabaseクライアントを取得
 * アプリケーション全体で同一インスタンスを使用
 */
export function getSupabaseClient(): SupabaseClient {
  if (!globalSupabaseClient) {
    globalSupabaseClient = createSupabaseClient();
  }
  return globalSupabaseClient;
}

/**
 * テスト環境でクライアントをリセット（テスト専用）
 */
export function resetSupabaseClient(): void {
  globalSupabaseClient = null;
}
