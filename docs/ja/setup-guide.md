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

##### ローカル開発

テンプレートから`.env`ファイルを作成:

```bash
# テンプレートをコピー
cp .env.example .env

# 値を編集
nano .env
```

必要な環境変数:

- **Supabase**: URL、Anonキー、サービスロールキー
- **Google Cloud**: プロジェクトID、リージョン、サービス名
- **LINE API**: チャンネルアクセストークン
- **Discord**: Webhook URL

詳細な説明付きの完全なリストは[`.env.example`](../../.env.example)を参照してください。

##### 本番環境（GitHub Actions）

CI/CDと本番デプロイメントでは、GitHub Secretsを設定:

1. リポジトリ設定 → Secrets and variables → Actions に移動
2. 必要なシークレットを追加:

**Supabaseデータベースマイグレーションシークレット:**

- `SUPABASE_ACCESS_TOKEN`: Supabaseダッシュボードからのパーソナルアクセストークン
- `SUPABASE_DB_PASSWORD`: Supabaseプロジェクトのデータベースパスワード
- `SUPABASE_PROJECT_ID`: プロジェクト参照ID（プロジェクト設定で確認）

**Google Cloud Platformシークレット:**

- `WIF_PROVIDER`: Workload Identity Federation プロバイダー
- `GC_SA_CICD`: CI/CDサービスアカウントメール
- `GC_PROJECT_ID`: GCPプロジェクトID
- `GC_REGION`: GCPリージョン（例: asia-northeast1）
- `GC_SA_CLOUD_RUN`: Cloud Runサービスアカウントメール

**外部サービスシークレット:**

- `SUPABASE_SERVICE_ROLE_KEY`: 本番用サービスロールキー
- `LINE_CHANNEL_ACCESS_TOKEN`: LINE Botチャンネルアクセストークン

3. GitHub Actionsワークフローでシークレットを検証

⚠️ **セキュリティ注意**:
`.env`ファイルやシークレットを絶対にバージョン管理にコミットしないでください

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

#### Cloud Tasks設定

- **キュー**: notifications
- **ロケーション**: asia-northeast1
- **リトライ**: 指数バックオフで3回試行

**開発環境**:

- **エミュレーター**: Cloud Tasks Emulator（Docker Compose内で起動）
- **ポート**: 8123
- **環境変数**: `CLOUD_TASKS_EMULATOR_HOST=cloud-tasks-emulator:8123`
- **自動検出**: 環境変数設定時、CloudTasksClientが自動的にエミュレーターに接続

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
# Cloud Runをローカルテスト
deno run --allow-net --allow-env src/main.ts

# curlでテスト
curl -X POST 'http://localhost:8080/api/send-notification' \
  -H 'Content-Type: application/json' \
  -d '{"ticketId": "test-123", "notificationType": "day_before"}'
```

## デプロイ

### データベースデプロイ

#### 自動デプロイ（推奨）

データベースマイグレーションは以下の条件で自動的にGitHub Actions経由でデプロイされます:

- `main`ブランチの`supabase/migrations/**`ディレクトリに変更がpushされたとき
- `migrate-database.yml`ワークフローが自動実行

#### 手動マイグレーションデプロイ

```bash
# ローカル手動デプロイ
supabase db push

# GitHub Actions手動トリガー
# Actions → "Migrate Supabase Database" → Run workflow に移動
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

- 通知を含むすべての操作にはCloud Run（2GB）を使用
- SupabaseはデータベースとPostgREST APIのみ使用
- すべてのビジネスロジックはCloud Runで実行

## アーキテクチャノート

- **アプリケーション実行**: すべてのビジネスロジックはCloud Runで実行
- **スクレイピング**: 十分なメモリ（2GB）でPlaywright実行
- **通知**: Cloud Runエンドポイント経由でLINE/Discord配信
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
