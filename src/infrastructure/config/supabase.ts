import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * プロダクション用Supabaseクライアント設定
 * 環境変数から接続情報を取得してクライアントを作成
 */
export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required',
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey);
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
