# Supabase Row Level Security (RLS) 設定

このドキュメントでは、浦和サポートハブデータベーステーブルの基本RLSポリシーを定義します。

## 概要

Row Level Security (RLS)
は、ユーザーがアクセス権限のあるデータのみにアクセスできるようにします。この個人用通知システムでは、チケットと通知データを保護するための基本セキュリティポリシーを実装します。

## データベーススキーマセキュリティ

### 1. チケットテーブルのRLSポリシー

**テーブル**: `tickets` **目的**: スクレイピングしたチケット販売情報の保存

```sql
-- チケットテーブルでRLSを有効化
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- ポリシー: サービスロールは全操作可能
CREATE POLICY "Service role full access on tickets"
ON tickets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ポリシー: 認証ユーザーはチケットの読み取りのみ可能
CREATE POLICY "Authenticated users can read tickets"
ON tickets
FOR SELECT
TO authenticated
USING (true);

-- ポリシー: 匿名ユーザーはチケットにアクセス不可
-- （ポリシー不要 - RLSがデフォルトで拒否）
```

### 2. 通知履歴テーブルのRLSポリシー

**テーブル**: `notification_history` **目的**: 重複防止のための送信済み通知の追跡

```sql
-- 通知履歴テーブルでRLSを有効化
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- ポリシー: サービスロールは全操作可能
CREATE POLICY "Service role full access on notification_history"
ON notification_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ポリシー: 認証ユーザーは自身の通知履歴のみ読み取り可能
CREATE POLICY "Authenticated users can read own notification_history"
ON notification_history
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id OR user_id IS NULL);

-- 注意: user_id IS NULL条件はシステム全体の通知読み取りを許可
-- シングルユーザーデプロイでは有効、マルチユーザーではアクセス制限

-- ポリシー: 匿名ユーザーは通知履歴にアクセス不可
-- （ポリシー不要 - RLSがデフォルトで拒否）
```

### 3. ユーザー購読テーブルのRLSポリシー（将来用）

**テーブル**: `user_subscriptions`（将来のマルチユーザー対応用） **目的**: ユーザー通知設定の管理

```sql
-- ユーザー購読テーブルでRLSを有効化
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自身の購読設定のみ管理可能
CREATE POLICY "Users can manage own subscriptions"
ON user_subscriptions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ポリシー: サービスロールは全操作可能
CREATE POLICY "Service role full access on user_subscriptions"
ON user_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

## ロールベースアクセス制御

### 1. サービスロール

**目的**: バックエンドサービス（Cloud Run、Edge Functions） **権限**: 全テーブルへのフルアクセス
**用途**: スクレイピングサービス、通知サービス

```sql
-- サービスロールは既にRLSバイパス機能を持つ
-- 上記以外の追加ポリシーは不要
```

### 2. 認証ロール

**目的**: 将来のWebダッシュボードユーザー **権限**:
チケットの読み取り専用、自身の通知履歴のみ読み取り **用途**: チケット販売監視用Webインターフェース

**❌ 過剰権限を削除**: 全ユーザーの通知履歴読み取りは不可

### 3. 匿名ロール

**目的**: 未認証アクセス **権限**: 全テーブルへのアクセス不可 **用途**:
このアプリケーションでは未使用

## セキュリティ実装

### 1. 環境別キー

```bash
# 開発環境
SUPABASE_URL="https://your-dev-project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."  # 制限された権限の公開キー
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # バックエンド用フルアクセスキー

# 本番環境
SUPABASE_URL="https://your-prod-project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."  # 制限された権限の公開キー
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # バックエンド用フルアクセスキー
```

### 2. クライアント設定

```typescript
// バックエンドサービス用（フルアクセス）
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// フロントエンド/認証アクセス用（制限アクセス）
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);
```

## RLSポリシーテスト

### 1. サービスロールアクセステスト

```sql
-- サービスロールキーで接続
SELECT count(*) FROM tickets;  -- 全レコード返却される
INSERT INTO tickets (...) VALUES (...);  -- 成功する
```

### 2. 認証ユーザーアクセステスト

```sql
-- anonキー + ユーザー認証で接続
SELECT count(*) FROM tickets;  -- 全レコード返却される（読み取り専用）
INSERT INTO tickets (...) VALUES (...);  -- 失敗する（挿入権限なし）
```

### 3. 匿名アクセステスト

```sql
-- anonキーのみで接続
SELECT count(*) FROM tickets;  -- 0を返却またはエラー
```

## セキュリティベストプラクティス

### 1. キー管理

- サービスロールキーを安全に保存（環境変数のみ）
- キーを定期的にローテーション（90日ごと）
- サービスロールキーをクライアントサイドコードで公開しない
- 公開/認証クライアントアクセスにはanonキーを使用

### 2. ポリシーレビュー

- 月次でRLSポリシーをレビュー
- スキーマ変更後にポリシーをテスト
- ポリシー変更をこのファイルに文書化
- 最小権限の原則を使用

### 3. 監視

```sql
-- 認証失敗試行の監視
SELECT * FROM auth.audit_log_entries 
WHERE event_type = 'token_verification_failure'
ORDER BY created_at DESC;

-- RLSポリシー違反の監視
SELECT * FROM postgres_log 
WHERE message LIKE '%policy violation%'
ORDER BY log_time DESC;
```

## 緊急時対応手順

### 1. RLS無効化（緊急時のみ）

```sql
-- 緊急時: RLSを一時的に無効化
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history DISABLE ROW LEVEL SECURITY;

-- 問題修正後は必ず再有効化
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
```

### 2. 漏洩キーの無効化

```bash
# Supabaseダッシュボードでキーを無効化・再生成
# 環境変数を即座に更新
# キーローテーション後に全サービスをテスト
```

## 実装コマンド

### RLSポリシーの適用

```sql
-- Supabase SQLエディターでこれらのコマンドを実行
-- 上記で定義したポリシーをコピー＆ペースト

-- ポリシーが有効であることを確認
SELECT * FROM pg_policies WHERE tablename IN ('tickets', 'notification_history');
```
