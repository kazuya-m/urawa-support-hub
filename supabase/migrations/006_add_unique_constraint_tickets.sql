-- チケット重複防止のためのUNIQUE制約追加
-- 同じ試合名、会場、試合日の組み合わせは一意であるべき

ALTER TABLE tickets 
ADD CONSTRAINT unique_ticket_match 
UNIQUE (match_name, venue, match_date);

-- sale_end_dateカラム追加（将来の拡張用）
-- 販売終了日時を記録することで、販売期間を完全に管理
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMPTZ;

-- インデックスの追加（UNIQUE制約により自動的に作成されるが明示的に記載）
COMMENT ON CONSTRAINT unique_ticket_match ON tickets IS 
'チケット重複防止制約: (match_name, venue, match_date)の組み合わせで一意性を保証';

COMMENT ON COLUMN tickets.sale_end_date IS 
'チケット販売終了日時。発売後にスクレイピングで取得される。';

-- homeTeam/awayTeam をオプショナル化
-- matchNameから抽出できない場合はNULLとして扱う

-- 既存の "Unknown Team" データをNULLに変更
UPDATE tickets 
SET 
  home_team = CASE 
    WHEN home_team = 'Unknown Home Team' THEN NULL 
    ELSE home_team 
  END,
  away_team = CASE 
    WHEN away_team = 'Unknown Away Team' THEN NULL 
    ELSE away_team 
  END;

-- NOT NULL 制約を削除
ALTER TABLE tickets 
  ALTER COLUMN home_team DROP NOT NULL,
  ALTER COLUMN away_team DROP NOT NULL;

-- UNIQUE制約を調整（NULLを含む場合の処理）
-- PostgreSQLではNULLは異なる値として扱われるため、UNIQUE制約は有効
COMMENT ON COLUMN tickets.home_team IS 
'ホームチーム名。matchNameから抽出できない場合はNULL';

COMMENT ON COLUMN tickets.away_team IS 
'アウェイチーム名。matchNameから抽出できない場合はNULL';