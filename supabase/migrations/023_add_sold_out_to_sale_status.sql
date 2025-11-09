-- Add 'sold_out' to sale_status check constraint for issue #189
-- Jリーグチケットサイトで「空席なし」表示時にsold_outステータスを設定できるようにする

-- 既存のCHECK制約を削除
ALTER TABLE tickets
DROP CONSTRAINT IF EXISTS tickets_sale_status_check;

-- 新しいCHECK制約を追加（sold_outを含む）
ALTER TABLE tickets
ADD CONSTRAINT tickets_sale_status_check
CHECK (sale_status IN ('before_sale', 'on_sale', 'sold_out', 'ended') OR sale_status IS NULL);

-- コメント追加
COMMENT ON COLUMN tickets.sale_status IS 'Ticket sale status: before_sale, on_sale, sold_out, ended, or NULL if status could not be determined';
