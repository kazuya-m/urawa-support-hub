# urawa-support-hub

浦和レッズのアウェイチケット販売情報を自動通知するシステム

> **Google Cloud Run + Supabase** | **自動CI/CD**

## 概要

浦和レッズのアウェイチケット情報を自動収集し、販売開始前にLINE通知を送信するシステムです。

**主要機能:**

- 🎫 Playwrightスクレイピングによる自動チケット監視（Jリーグチケット、サンフレッチェ広島公式サイト）
- 📱 Google Cloud Tasksによる通知スケジューリングとLINEブロードキャスト通知（販売開始前日20:00・1時間前・15分前）
- 🗓️ 毎月1日20:00に販売中・販売前チケットの一覧をLINEで送信
- 🏗️ ハイブリッド構成: Google Cloud（スクレイピング・通知送信） + Supabase（データベース）
- 🔄 Google Cloud Schedulerによる毎日自動実行

## アーキテクチャ

### Google Cloud + Supabase ハイブリッド構成

```
┌─────────────────────────────────────────────────┐
│  Google Cloud Scheduler                         │
│  ├── 毎日05:00 JST → /api/collect-tickets       │
│  └── 毎月1日20:00 JST → /api/ticket-summary     │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  Cloud Run（単一サービス: urawa-support-hub）   │
│  ├── Playwrightスクレイピング (2GB, 300s)       │
│  ├── チケットデータ収集・保存                   │
│  ├── Cloud Tasksへの通知タスク登録              │
│  └── LINE通知送信（/api/send-notification）     │
└───────┬─────────────────────────▲───────────────┘
        │                         │ 販売開始前の指定時刻
┌───────▼─────────────────┐ ┌─────┴───────────────┐
│  Supabase PostgreSQL    │ │  Google Cloud Tasks │
│  └── tickets,           │ │  (notifications     │
│      notifications      │ │   キュー)           │
└─────────────────────────┘ └─────────────────────┘
```

コードの層構成は簡素化に向けて移行中です（#204）。移行後の構成は #215 で記載します。

### 技術スタック

- **スクレイピング**: Google Cloud Run + Playwright
- **スケジューリング**: Google Cloud Scheduler + Cloud Tasks
- **通知送信**: Cloud Run + LINE Messaging API
- **データベース**: Supabase PostgreSQL（古いレコードの削除は pg_cron）
- **ログ管理**: Google Cloud Logging（構造化ログ）
- **ランタイム**: Deno + TypeScript
- **CI/CD**: GitHub Actions

## ドキュメント

📚 **主要ドキュメント**（`/docs`配下）:

- **[ドキュメント索引](docs/INDEX.md)** - 全ドキュメントの目次
- **[セットアップガイド](docs/setup-guide.md)** - 環境構築とデプロイ
- **[GitHub Secrets設定](docs/github-secrets-setup.md)** - CI/CD のシークレット
- **[要件定義](docs/requirements.md)** - 機能要件と非機能要件

設計ドキュメント（[システムアーキテクチャ](docs/system-architecture.md)、[実装ガイド](docs/implementation-guide.md)、[テストガイドライン](docs/testing-guidelines.md) など）は、コードの移行（#204）に合わせて書き直し中のため、現在のコードと異なる記述を含みます。

## クイックスタート

### 前提条件

- Deno v2.x（CI・Dockerfile は 2.4.5 に固定）
- Docker & Docker Compose（ローカル開発用）
- Supabase CLI（ローカルDB・統合テスト用）

### 開発環境セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/kazuya-m/urawa-support-hub.git
cd urawa-support-hub

# ローカルSupabaseを起動
deno task db:start

# Docker開発環境を起動（Cloud Tasks Emulator含む。.env.local が必要）
deno task dev

# テスト実行
deno test --allow-env --allow-net=127.0.0.1

# 型チェック & Lint & フォーマット確認
deno task pre-commit
```

**開発環境に含まれるサービス**:

- アプリケーションコンテナ (ポート: 8080)
- Cloud Tasks Emulator (ポート: 8123) - 通知スケジューリングのローカルテスト用（キュー名の制約は[セットアップガイド](docs/setup-guide.md#2-環境変数ファイル)を参照）

環境変数と `.env` / `.env.local` の使い分けは[セットアップガイド](docs/setup-guide.md)を参照してください。

### 開発コマンド

```bash
# 開発
deno task dev              # watchモードで起動
deno task dev:down         # コンテナ停止
deno task dev:logs         # ログ表示

# テスト
deno test --allow-env --allow-net=127.0.0.1  # 全テスト実行
deno task pre-commit       # 型チェック + Lint + フォーマット確認

# コード品質
deno fmt                   # コードフォーマット
deno check **/*.ts         # 型チェック
deno lint                  # Lintチェック
```

## テスト

```bash
# 全テスト実行
deno test --allow-env --allow-net=127.0.0.1

# ユニットテストのみ
deno test src/

# 統合テスト（ローカルSupabaseが必要）
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# カバレッジレポート
deno test --allow-env --allow-net=127.0.0.1 --coverage=coverage
deno coverage coverage
```

## CI/CD

### GitHub Actions

| ワークフロー           | トリガー                                                                     | 内容                                                                   |
| ---------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ci.yml`               | `main` への push、Pull Request                                               | フォーマット確認 → Lint → 型チェック → テスト                          |
| `deploy.yml`           | `main` への push、手動実行                                                   | Dockerイメージのビルド・Artifact Registry へのpush・Cloud Run デプロイ |
| `deploy-scheduler.yml` | `infrastructure/scheduler/**` または `deploy-scheduler.yml` の変更、手動実行 | Cloud Scheduler ジョブの作成・更新                                     |
| `migrate-database.yml` | `supabase/migrations/**` の変更、手動実行                                    | Supabase へのマイグレーション適用                                      |

### 必要なシークレット

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_DB_PASSWORD
SUPABASE_PROJECT_ID
WIF_PROVIDER
GC_PROJECT_ID
GC_REGION
GC_SA_CICD
GC_SA_CLOUD_RUN
GC_SA_SCHEDULER
CLOUD_RUN_URL
```

`LINE_CHANNEL_ACCESS_TOKEN` は GitHub Secrets ではなく Google Secret Manager に登録します。詳細は[GitHub Secrets設定](docs/github-secrets-setup.md)を参照。

## 運用

### コスト

**目標**: 月額$0.00（無料枠のみ）

- **Google Cloud**: 無料枠（Cloud Run, Scheduler, Tasks, Logging）
- **Supabase**: 500MB DB（無料枠）
- **LINE**: コミュニケーションプランの無料メッセージ数内（ブロードキャストはフォロワー数 × 通数で数える）

**使用量の目安**:

- Cloud Run: 日次収集 約30回/月 + 月次サマリー 1回/月 + 通知送信（チケット1件につき最大3回）
- DB: < 10MB
- ログ: Cloud Logging無料枠内

### 監視

- **エラー追跡**: Google Cloud Logging構造化ログ
- **ヘルスチェック**: `GET /health`（必須環境変数の有無を確認）
- **通知失敗**: `notifications` テーブルの `status = 'failed'` とログで確認

## 開発ガイドライン

開発時は[CLAUDE.md](CLAUDE.md)を参照してください。
