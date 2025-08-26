-- セキュアなシステムアクセス用RLSポリシー
-- Service Role Keyによる無制限アクセスを制限し、JWT claims ベースの制御を実装

-- 1. システム用ユーザーロール作成
CREATE ROLE IF NOT EXISTS urawa_scraper_service;
CREATE ROLE IF NOT EXISTS urawa_notification_service;
CREATE ROLE IF NOT EXISTS urawa_monitoring_service;

-- 2. Tickets テーブル用セキュアポリシー

-- 既存のフルアクセスポリシーを削除
DROP POLICY IF EXISTS "Service role full access on tickets" ON tickets;

-- スクレイピングサービス専用ポリシー (INSERT/UPDATE のみ)
CREATE POLICY "Scraper service write access"
ON tickets
FOR INSERT, UPDATE
TO urawa_scraper_service
USING (true)
WITH CHECK (true);

-- 通知サービス専用ポリシー (SELECT のみ)  
CREATE POLICY "Notification service read access"
ON tickets
FOR SELECT
TO urawa_notification_service
USING (true);

-- モニタリングサービス専用ポリシー (SELECT のみ)
CREATE POLICY "Monitoring service read access"
ON tickets  
FOR SELECT
TO urawa_monitoring_service
USING (true);

-- 3. Notification History テーブル用セキュアポリシー

-- 既存のフルアクセスポリシーを削除
DROP POLICY IF EXISTS "Service role full access on notification_history" ON notification_history;

-- 通知サービス専用ポリシー (フルアクセス)
CREATE POLICY "Notification service full access"
ON notification_history
FOR ALL
TO urawa_notification_service  
USING (true)
WITH CHECK (true);

-- モニタリングサービス専用ポリシー (SELECT のみ)
CREATE POLICY "Monitoring service read access"
ON notification_history
FOR SELECT
TO urawa_monitoring_service
USING (true);

-- 4. JWT claims ベースの認証機能

-- JWT claims を検証するヘルパー関数
CREATE OR REPLACE FUNCTION auth.get_jwt_claim(claim_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json ->> claim_name,
        ''
    );
END;
$$;

-- サービス種別を検証する関数
CREATE OR REPLACE FUNCTION auth.is_service(service_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
BEGIN
    RETURN auth.get_jwt_claim('service') = service_name 
           AND auth.get_jwt_claim('role') = 'service_role';
END;
$$;

-- 5. JWT claims ベースのセキュアポリシー (将来実装用)

-- スクレイピングサービス JWT ベースポリシー
CREATE POLICY "JWT scraper service access"
ON tickets
FOR INSERT, UPDATE
USING (auth.is_service('scraper'));

-- 通知サービス JWT ベースポリシー  
CREATE POLICY "JWT notification service read"
ON tickets
FOR SELECT
USING (auth.is_service('notification'));

-- 通知履歴への JWT ベースアクセス
CREATE POLICY "JWT notification service history"
ON notification_history
FOR ALL
USING (auth.is_service('notification'));

-- 6. 一時的な移行期間用ポリシー

-- ANON key での制限付きアクセス許可（RLS適用）
CREATE POLICY "Anon key limited read access"
ON tickets
FOR SELECT
TO anon
USING (
    -- 営業時間内のみアクセス許可（JST 6:00-23:00）
    EXTRACT(hour FROM (NOW() AT TIME ZONE 'Asia/Tokyo')) BETWEEN 6 AND 23
    AND sale_start_date >= CURRENT_DATE - INTERVAL '7 days'  -- 過去7日以内のデータのみ
);

-- 7. セキュリティ監査用ビュー

-- ポリシー適用状況確認用ビュー
CREATE OR REPLACE VIEW security_audit_policies AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('tickets', 'notification_history')
ORDER BY tablename, policyname;

-- アクセスログ用テーブル（将来実装）
CREATE TABLE IF NOT EXISTS access_audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_role TEXT,
    jwt_claims JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- 8. 権限設定

-- システムロールに必要な最小権限を付与
GRANT SELECT ON tickets TO urawa_notification_service, urawa_monitoring_service;
GRANT INSERT, UPDATE ON tickets TO urawa_scraper_service;
GRANT ALL ON notification_history TO urawa_notification_service;
GRANT SELECT ON notification_history TO urawa_monitoring_service;

-- シーケンス権限も必要
GRANT USAGE ON SEQUENCE tickets_id_seq TO urawa_scraper_service;
GRANT USAGE ON SEQUENCE notification_history_id_seq TO urawa_notification_service;