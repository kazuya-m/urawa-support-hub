-- 012_add_competition_remove_matchtime_and_sale_start_time.sql
-- 大会名フィールドの追加、matchTimeフィールドとsale_start_timeフィールドの削除

-- ticketsテーブルにcompetitionカラムを追加
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS competition VARCHAR(100);

-- matchTimeカラムの削除（統合されたmatchDateを使用するため）
ALTER TABLE public.tickets
DROP COLUMN IF EXISTS match_time;

-- sale_start_timeカラムの削除（統合されたsale_start_dateを使用するため）
ALTER TABLE public.tickets
DROP COLUMN IF EXISTS sale_start_time;

-- インデックスの追加（大会別の検索を高速化）
CREATE INDEX IF NOT EXISTS idx_tickets_competition 
ON public.tickets(competition);

-- 関連インデックスの削除（存在する場合）
DROP INDEX IF EXISTS idx_tickets_match_time;

-- コメントの追加
COMMENT ON COLUMN public.tickets.competition IS '大会名（例: J1リーグ, ルヴァンカップ, ACL）';

-- 既存データの更新（オプション）
-- 既存のチケットデータに大会名を推測して設定する場合
UPDATE public.tickets
SET competition = 
  CASE 
    WHEN match_name ILIKE '%ルヴァン%' THEN 'ルヴァンカップ'
    WHEN match_name ILIKE '%天皇杯%' THEN '天皇杯'
    WHEN match_name ILIKE '%ACL%' OR match_name ILIKE '%AFC%' THEN 'ACL'
    ELSE 'J1リーグ'
  END
WHERE competition IS NULL 
  AND match_name IS NOT NULL;