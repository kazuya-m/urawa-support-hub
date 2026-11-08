# データベース自動クリーンアップ

`tickets` と `notifications` の古いレコードを pg_cron
で定期的に削除し、データベースの肥大化を防ぎます。

## 保持ポリシー

pg_cron のスケジュールは UTC で解釈されます。

| ジョブ                       | 対象テーブル    | 削除条件                                                         | スケジュール（UTC） | JST            | 定義                                 |
| ---------------------------- | --------------- | ---------------------------------------------------------------- | ------------------- | -------------- | ------------------------------------ |
| `cleanup-old-tickets`        | `tickets`       | `match_date < NOW() - INTERVAL '30 days'`                        | `0 17 * * *`        | 毎日 02:00     | migration 024                        |
| `cleanup-sent-notifications` | `notifications` | `status = 'sent' AND sent_at < NOW() - INTERVAL '30 days'`       | `30 17 * * *`       | 毎日 02:30     | migration 025                        |
| `weekly-cleanup`             | `tickets`       | `match_date < NOW() - INTERVAL '7 days'`（`cleanup_old_data()`） | `0 2 * * 0`         | 毎週日曜 11:00 | migration 002（関数は 013 で再定義） |

`weekly-cleanup` が呼ぶ `cleanup_old_data()` は `SET search_path = ''`
で定義されていますが、`tickets`
をスキーマなしで参照しています。このため実行時にテーブルを解決できずエラーになると考えられます。成功していればチケットは試合日から
7〜14 日で削除され、失敗していれば `cleanup-old-tickets` により 30
日で削除されます。実際の結果は下記「実行履歴」のクエリで確認してください。

`notifications.ticket_id` は `tickets(id)` への外部キーで `ON DELETE CASCADE`（migration
017）です。チケットが削除されると、そのチケットの通知も状態にかかわらず削除されます。

## 構成

```
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Supabase)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐     ┌──────────────────────────────────────┐   │
│  │  pg_cron    │────▶│  スケジュール済みジョブ              │   │
│  │  拡張       │     │  - cleanup-old-tickets               │   │
│  └─────────────┘     │  - cleanup-sent-notifications        │   │
│                      │  - weekly-cleanup                    │   │
│                      └──────────────────────────────────────┘   │
│                                    │                            │
│                                    ▼                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DELETE                                                  │   │
│  │  - tickets（→ notifications も CASCADE で削除）          │   │
│  │  - notifications: status='sent' かつ送信から 30 日超     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  手動クリーンアップ関数                                  │   │
│  │  - manual_cleanup_old_tickets(retention_days)            │   │
│  │  - manual_cleanup_sent_notifications(retention_days)     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 削除ロジック

### tickets

```sql
-- cleanup-old-tickets
DELETE FROM public.tickets
WHERE match_date < NOW() - INTERVAL '30 days';

-- weekly-cleanup（cleanup_old_data()）
DELETE FROM tickets
WHERE match_date < NOW() - INTERVAL '7 days';
```

試合が終わったチケットは通知の対象外になるため、削除します。

### notifications

```sql
DELETE FROM public.notifications
WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '30 days';
```

このジョブが削除するのは `sent` の通知だけです。`scheduled`・`failed`・`cancelled`
の通知は、紐づくチケットが削除されるまで残ります。

## 手動クリーンアップ関数

任意の保持期間で削除するときに使います。どちらも `service_role` にだけ実行権限があります。

### 古いチケットの削除

```sql
SELECT * FROM manual_cleanup_old_tickets(30);  -- 既定: 30 日
SELECT * FROM manual_cleanup_old_tickets(7);   -- 任意: 7 日
```

**戻り値**:

| カラム          | 型      | 説明               |
| --------------- | ------- | ------------------ |
| `deleted_count` | INTEGER | 削除したレコード数 |
| `cleanup_info`  | TEXT    | 削除内容の説明     |

### 送信済み通知の削除

```sql
SELECT * FROM manual_cleanup_sent_notifications(30);  -- 既定: 30 日
SELECT * FROM manual_cleanup_sent_notifications(7);   -- 任意: 7 日
```

**戻り値**: `manual_cleanup_old_tickets` と同じ。

## セキュリティ

### スキーマの明示

手動クリーンアップ関数は `public.` を明示してテーブルを指定します。

```sql
DELETE FROM public.tickets ...
DELETE FROM public.notifications ...
```

**理由**: 関数は search_path インジェクション対策として `SET search_path = ''`
を設定しているため、スキーマを省略するとテーブルが見つかりません。

### 権限

- cron ジョブはデータベース所有者の権限で実行される
- 手動関数の実行権限は `service_role` にのみ付与している

## 確認方法

### スケジュール済みジョブ

```sql
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname IN ('cleanup-old-tickets', 'cleanup-sent-notifications', 'weekly-cleanup');
```

### 実行履歴

```sql
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### 削除対象の件数（削除はしない）

```sql
SELECT COUNT(*) FROM tickets WHERE match_date < NOW() - INTERVAL '7 days';
SELECT COUNT(*) FROM notifications WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '30 days';
```

## マイグレーションファイル

- `supabase/migrations/002_cron_jobs.sql`: `weekly-cleanup` の登録
- `supabase/migrations/013_remove_unused_log_tables.sql`: `cleanup_old_data()` の現在の定義
- `supabase/migrations/024_auto_cleanup_tickets_notifications.sql`:
  `cleanup-old-tickets`、`manual_cleanup_old_tickets`
- `supabase/migrations/025_update_notification_cleanup_retention.sql`:
  `cleanup-sent-notifications`、`manual_cleanup_sent_notifications`

## テスト

統合テスト: `tests/integration/database-cleanup.test.ts`

| テストケース                        | 内容                                                 |
| ----------------------------------- | ---------------------------------------------------- |
| `manual_cleanup_old_tickets`        | 試合日から 30 日を過ぎたチケットが削除されること     |
| `manual_cleanup_sent_notifications` | 送信から 30 日を過ぎた `sent` の通知が削除されること |
| `retention period edge cases`       | 境界値（29 日と 31 日）の扱い                        |

## トラブルシューティング

### cron ジョブが実行されない

1. `pg_cron` 拡張が有効か確認する
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. ジョブが登録されているか確認する
   ```sql
   SELECT * FROM cron.job;
   ```

3. 実行ログを確認する
   ```sql
   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
   ```

### 手動関数がエラーになる

- `service_role` キーで実行しているか確認する（`anon` キーでは実行できない）

## 関連ドキュメント

- [Supabase RLS 設定](security/supabase-rls-settings.md)
- [データベーススキーマ（マイグレーション）](../supabase/migrations/)
