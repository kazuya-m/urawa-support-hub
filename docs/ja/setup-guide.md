# 環境セットアップガイド

urawa-support-hub Google Cloud + Supabase ハイブリッドアーキテクチャの簡単セットアップガイドです。

## クイックスタート

### 前提条件

```bash
# 1. 必要なツールをインストール
curl -fsSL https://deno.land/install.sh | sh  # Denoランタイム
npm install -g supabase                       # Supabase CLI
curl https://sdk.cloud.google.com | bash     # Google Cloud CLI

# 2. インストール確認
deno --version
supabase --version
gcloud --version
```

### コアセットアップ

#### 1. Supabaseセットアップ

```bash
# ログインとプロジェクト作成
supabase login
supabase init
supabase start

# supabase status からローカルURLとキーをメモ
```

#### 2. Google Cloudセットアップ

```bash
# ログインとプロジェクト設定
gcloud auth login
gcloud config set project your-project-id

# 必要なAPIを有効化
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudtasks.googleapis.com
```

#### 3. 環境変数

`.env`ファイルを作成:

```bash
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
CLOUD_TASKS_LOCATION=asia-northeast1
CLOUD_TASKS_QUEUE=notifications

# 外部サービス
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
DISCORD_WEBHOOK_URL=your-discord-webhook
```

## 開発ワークフロー

### 日常コマンド

```bash
# ローカル環境開始
supabase start

# テスト実行
deno test --allow-env --allow-net=127.0.0.1

# 型チェック
deno check src/**/*.ts

# コードフォーマット
deno fmt src/
```

### アーキテクチャ固有セットアップ

#### Cloud Run設定

- **メモリ**: 2GB（Playwrightスクレイピング用）
- **タイムアウト**: 300秒
- **同時実行**: 1（順次処理）

#### Edge Functions設定

- **メモリ**: 512MB（通知用）
- **タイムアウト**: 60秒
- **ランタイム**: TypeScript付きDeno

#### Cloud Tasks設定

- **キュー**: notifications
- **ロケーション**: asia-northeast1
- **リトライ**: 指数バックオフで3回試行

## テストセットアップ

### ローカルテスト

```bash
# ユニットテスト
deno test src/ --coverage

# Supabase統合テスト
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# テスト権限（必要最小限）
--allow-env --allow-net=127.0.0.1
```

### クラウド統合テスト

```bash
# Edge Functionsをローカルテスト
supabase functions serve

# curlでテスト
curl -X POST 'http://127.0.0.1:54321/functions/v1/send-notification' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'
```

## デプロイ

### データベースデプロイ

```bash
# データベーススキーマをデプロイ
supabase db push

# Edge Functionsをデプロイ
supabase functions deploy
```

### Cloud Runデプロイ

```bash
# ビルドとデプロイ
gcloud run deploy urawa-scraper \
  --source . \
  --region asia-northeast1 \
  --memory 2Gi \
  --timeout 300
```

### スケジューラーセットアップ

```bash
# 日次トリガー作成
gcloud scheduler jobs create http daily-scraping \
  --location asia-northeast1 \
  --schedule="0 3 * * *" \
  --uri="your-cloud-run-url/scrape"
```

## トラブルシューティング

### よくある問題

**Supabase接続**

```bash
# ステータス確認
supabase status

# サービス再起動
supabase stop && supabase start
```

**Google Cloud認証**

```bash
# 認証確認
gcloud auth list

# 再認証
gcloud auth login
```

**メモリ問題**

- Playwright操作にはCloud Run（2GB）を使用
- 簡単な通知にはEdge Functions（512MB）を使用
- Edge FunctionsでPlaywrightは絶対に実行しない

## アーキテクチャノート

- **スクレイピング**: Playwright用十分メモリのCloud Runで実行
- **通知**: コスト効率のためEdge Functionsで実行
- **スケジューリング**: 信頼性のためCloud Scheduler + Cloud Tasks
- **データベース**: 自動API生成付きSupabase PostgreSQL
- **コスト**: 無料枠制限内での運用設計

## 次のステップ

1. システム設計は[システムアーキテクチャドキュメント](system-architecture.md)を参照
2. [技術選定根拠](tech-selection.md)をレビュー
3. 仕様は[要件ドキュメント](requirements.md)を確認
4. [実装ガイド](implementation-guide.md)を参照

---

詳細なアーキテクチャ情報については、常に`/docs`の最新ドキュメントを参照してください。
