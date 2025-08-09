-- urawa-support-hub initial database schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- チケット情報テーブル
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_name TEXT NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  sale_start_date TIMESTAMPTZ NOT NULL,
  sale_start_time TEXT,
  venue TEXT NOT NULL,
  ticket_types TEXT[] NOT NULL,
  ticket_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT match_date_future CHECK (match_date > created_at),
  CONSTRAINT sale_date_valid CHECK (sale_start_date > created_at),
  CONSTRAINT ticket_types_not_empty CHECK (array_length(ticket_types, 1) > 0),
  CONSTRAINT valid_url CHECK (ticket_url LIKE 'http%')
);

-- 通知履歴テーブル
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN ('day_before', 'hour_before', 'minutes_before')
  ),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'failed')
  ),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 重複防止制約
  UNIQUE(ticket_id, notification_type)
);

-- エラーログテーブル
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- システムメトリクステーブル
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- インデックス作成
CREATE INDEX idx_tickets_match_date ON tickets(match_date);
CREATE INDEX idx_tickets_sale_start_date ON tickets(sale_start_date);
CREATE INDEX idx_notification_history_scheduled_at ON notification_history(scheduled_at);
CREATE INDEX idx_notification_history_status ON notification_history(status);
CREATE INDEX idx_system_metrics_name_timestamp ON system_metrics(metric_name, metric_timestamp);

-- RLS有効化
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Service Role用ポリシー
CREATE POLICY "Service role full access tickets" ON tickets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access notifications" ON notification_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access error_logs" ON error_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access system_metrics" ON system_metrics
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');