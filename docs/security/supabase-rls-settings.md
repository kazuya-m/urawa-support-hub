# Supabase Row Level Security (RLS) 設定

urawa-support-hub のデータベーステーブルに設定している RLS ポリシーです。

## 概要

アプリケーションは Cloud Run 上のバックエンドだけで、エンドユーザーが Supabase に直接アクセスする経路はありません。そのため RLS は「`service_role` 以外のアクセスをすべて拒否する」ために使います。

## テーブルとポリシー

対象は `tickets` と `notifications` の 2 テーブルです。どちらも RLS を有効にし、`service_role` だけを許可するポリシーを 1 つ設定しています（`supabase/migrations/020_remove_unused_postgresql_functions_cron_jobs.sql`）。

```sql
CREATE POLICY "Service role full access tickets" ON tickets
  FOR ALL USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access notifications" ON notifications
  FOR ALL USING ((select auth.jwt()) ->> 'role' = 'service_role');
```

`auth.jwt()` を `(select ...)` で囲み、行ごとではなくクエリごとに 1 回だけ評価させています。

| テーブル        | 用途                                     | `service_role` | `authenticated` | `anon` |
| --------------- | ---------------------------------------- | -------------- | --------------- | ------ |
| `tickets`       | スクレイピングしたチケット販売情報       | 全操作         | 不可            | 不可   |
| `notifications` | 通知のスケジュールと送信結果（重複防止） | 全操作         | 不可            | 不可   |

`authenticated` と `anon` にはポリシーがないため、RLS により全行が拒否されます。

## ロールと利用箇所

| ロール          | 利用箇所                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `service_role`  | アプリケーション本体。`src/config/supabase.ts` の `createSupabaseAdminClient()` が `SUPABASE_SERVICE_ROLE_KEY` で接続する。`service_role` は RLS をバイパスするため、上記ポリシーに関係なく全操作が可能 |
| `anon`          | テスト用クライアント（`src/shared/testing/TestSupabaseClient.ts`）のみ。本番では使わない                                                                                                                |
| `authenticated` | 使わない                                                                                                                                                                                                |

```typescript
// src/config/supabase.ts（アプリケーションが使う管理者クライアント）
return createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

## 既知の制約

- アプリケーションは単一の `service_role` キーで全操作を行うため、スクレイピングと通知送信で権限を分けていない。キーが漏洩すると全テーブルの読み書きが可能になる
- そのため `SUPABASE_SERVICE_ROLE_KEY` は Secret Manager で管理し、Cloud Run 以外に渡さない（[環境変数管理](environment-variable-management.md)）

## ポリシーの確認

```sql
-- 設定されているポリシー
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('tickets', 'notifications');

-- RLS が有効か
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('tickets', 'notifications');
```

anon キーで REST API にアクセスし、結果が空配列になることでも確認できます。

```bash
curl "${SUPABASE_URL}/rest/v1/tickets?select=id&limit=1" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"
# => []
```

## ポリシーの変更

- ポリシーの変更は `supabase/migrations/` にマイグレーションとして追加し、`migrate-database.yml` で適用する（Supabase SQL エディターで直接変更しない）
- 新しいテーブルを追加するときは、同じマイグレーション内で RLS を有効にし、`service_role` のポリシーを追加する
- 変更後は上記のクエリでポリシーを確認し、このドキュメントを更新する

## 緊急時の対応

**サービスロールキーの漏洩**

1. Supabase ダッシュボードで JWT secret を再生成し、キーを再発行する
2. Secret Manager の `SUPABASE_SERVICE_ROLE_KEY` に新しいバージョンを追加し、Cloud Run を再デプロイする
3. CI 用の GitHub Secrets とローカルの環境変数ファイルを更新する
4. データに不審な変更がないか確認する

RLS を無効化（`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`）すると anon キーで全データにアクセスできるようになるため、障害対応でも無効化しないでください。
