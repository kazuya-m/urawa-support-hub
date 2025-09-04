-- System health tracking for Supabase free tier auto-pause prevention
-- This ensures database activity occurs daily to prevent 7-day inactivity suspension

-- システムヘルステーブル
CREATE TABLE system_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  executed_at TIMESTAMPTZ NOT NULL,
  tickets_found INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (
    status IN ('success', 'error', 'partial')
  ),
  execution_duration_ms INTEGER,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_system_health_executed_at ON system_health(executed_at DESC);
CREATE INDEX idx_system_health_status ON system_health(status);

-- RLS有効化
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Service Role用ポリシー
CREATE POLICY "Service role full access system_health" ON system_health
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 古いヘルスレコードの自動削除（30日より古いもの）
-- 実際の実装ではCloud Schedulerまたは定期的なクリーンアップで実行
CREATE OR REPLACE FUNCTION cleanup_old_health_records()
RETURNS void AS $$
BEGIN
  DELETE FROM system_health 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql
SET search_path = '';