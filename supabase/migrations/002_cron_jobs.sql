-- urawa-support-hub cron jobs setup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 毎日12:00 JST (03:00 UTC) でチケットチェック
SELECT cron.schedule(
  'daily-ticket-check',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url') || '/functions/v1/daily-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('source', 'cron')
  ) as request_id;
  $$
);

-- 5分間隔で通知チェック
SELECT cron.schedule(
  'notification-check',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url') || '/functions/v1/notification-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('source', 'cron')
  ) as request_id;
  $$
);

-- パフォーマンス最適化用の追加インデックス
CREATE INDEX IF NOT EXISTS idx_tickets_composite ON tickets(away_team, match_date) 
WHERE away_team = '浦和レッズ';

CREATE INDEX IF NOT EXISTS idx_notification_pending ON notification_history(scheduled_at) 
WHERE status = 'pending';

-- 統計情報の定期更新関数
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE tickets;
  ANALYZE notification_history;
  ANALYZE error_logs;
  ANALYZE system_metrics;
END;
$$ LANGUAGE plpgsql;

-- 古いデータのクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- 7日前より古い試合のチケット情報を削除
  DELETE FROM tickets 
  WHERE match_date < NOW() - INTERVAL '7 days';
  
  -- 90日前より古いエラーログを削除
  DELETE FROM error_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- 30日前より古いシステムメトリクスを削除
  DELETE FROM system_metrics 
  WHERE metric_timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 週次データクリーンアップスケジュール
SELECT cron.schedule(
  'weekly-cleanup',
  '0 2 * * 0',
  'SELECT cleanup_old_data();'
);