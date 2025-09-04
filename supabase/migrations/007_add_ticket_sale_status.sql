-- Add sale status and scraped_at columns to tickets table for issue #62
-- Make optional fields nullable to allow saving incomplete ticket data

-- 販売状態と時刻管理のカラム追加
ALTER TABLE tickets 
ADD COLUMN sale_status TEXT NOT NULL DEFAULT 'before_sale'
  CHECK (sale_status IN ('before_sale', 'on_sale', 'ended'));

ALTER TABLE tickets 
ADD COLUMN scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- sale_end_dateカラムは006で既に追加済み

-- 通知スケジュール状態管理カラム追加
ALTER TABLE tickets 
ADD COLUMN notification_scheduled BOOLEAN NOT NULL DEFAULT FALSE;

-- オプショナルフィールドをNULL許容にする（スクレイピング失敗時でも保存可能）
ALTER TABLE tickets 
ALTER COLUMN sale_start_date DROP NOT NULL;

ALTER TABLE tickets 
ALTER COLUMN venue DROP NOT NULL;

ALTER TABLE tickets 
ALTER COLUMN ticket_url DROP NOT NULL;

-- ticket_typesは既にNULL許容（配列型のため空配列も許容）

-- 状態検索用インデックス
CREATE INDEX idx_tickets_sale_status ON tickets(sale_status);
CREATE INDEX idx_tickets_scraped_at ON tickets(scraped_at);

-- 既存データの初期状態設定
UPDATE tickets 
SET sale_status = CASE 
  WHEN sale_start_date > NOW() THEN 'before_sale'
  WHEN sale_start_date IS NULL THEN 'before_sale'
  ELSE 'on_sale'
END,
scraped_at = updated_at;

-- 空のvenue/ticket_urlがある場合はNULLに統一
UPDATE tickets 
SET venue = NULLIF(venue, ''),
    ticket_url = NULLIF(ticket_url, '');

-- notification_historyテーブルにnotification_scheduledカラム追加
ALTER TABLE notification_history 
ADD COLUMN notification_scheduled BOOLEAN NOT NULL DEFAULT FALSE;

-- 既存の通知履歴を「スケジュール済み」とマーク
UPDATE notification_history 
SET notification_scheduled = TRUE 
WHERE status IN ('pending', 'sent');

-- コメント追加
COMMENT ON COLUMN tickets.sale_start_date IS 'Sale start date from scraping. NULL if date could not be extracted. Notifications require non-NULL value.';
COMMENT ON COLUMN tickets.venue IS 'Venue name. NULL if could not be extracted from scraping.';
COMMENT ON COLUMN tickets.ticket_url IS 'Ticket purchase URL. NULL if could not be extracted from scraping.';