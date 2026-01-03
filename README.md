# urawa-support-hub

浦和レッズのアウェイチケット販売情報を自動通知するシステム

> **Google Cloud Run + Supabase** | **クリーンアーキテクチャ** | **自動CI/CD**

## 概要

浦和レッズのアウェイチケット情報を自動収集し、販売開始前にLINE通知を送信するシステムです。

**主要機能:**

- 🎫 Playwrightスクレイピングによる自動チケット監視（Cloud Run）
- 📱 Google Cloud Tasksによる通知スケジューリングとLINE通知送信（Cloud Run）
- 🏗️ ハイブリッドアーキテクチャ: Google Cloud（スクレイピング・通知送信） + Supabase（データ管理）
- 🔄 Google Cloud Schedulerによる毎日自動実行
- ✅ MVP稼働中（2025-09-16ローンチ）

## アーキテクチャ

### Google Cloud + Supabase ハイブリッド構成

```
┌─────────────────────────────────────────────────┐
│  Google Cloud Scheduler (毎日05:00 JST実行)     │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  Cloud Run（スクレイピング・通知送信）          │
│  ├── Playwrightスクレイピング (2GB, 300s)       │
│  ├── チケットデータ収集・保存                   │
│  ├── Cloud Tasksスケジューリング                │
│  └── LINE通知送信（Cloud Tasks経由）            │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│  Supabase PostgreSQL（データベース）            │
│  └── チケット、通知、スケジュール               │
└─────────────────────────────────────────────────┘
```

### 技術スタック

- **スクレイピング**: Google Cloud Run + Playwright
- **スケジューリング**: Google Cloud Scheduler + Cloud Tasks
- **通知送信**: Cloud Run + LINE Messaging API
- **データベース**: Supabase PostgreSQL
- **ログ管理**: Google Cloud Logging（構造化ログ）
- **ランタイム**: Deno + TypeScript
- **CI/CD**: GitHub Actions

## ドキュメント

📚 **必須ドキュメント**（`/docs`配下）:

- **[ドキュメント索引](docs/INDEX.md)** - 全ドキュメントの目次とナビゲーション
- **[システムアーキテクチャ](docs/system-architecture.md)** - ハイブリッド構成の完全設計
- **[実装ガイド](docs/implementation-guide.md)** - コードパターンと実装例
- **[セットアップガイド](docs/setup-guide.md)** - 環境構築とデプロイ
- **[テストガイドライン](docs/testing-guidelines.md)** - テスト戦略とパターン

📋 **プロジェクト管理**:

- **[Issue優先度ロードマップ](docs/issue-priority-roadmap.md)** - 開発フェーズと優先順位

🌐 **言語**: 日本語（主言語） | [English](docs/INDEX.md)

## クイックスタート

### 前提条件

- Deno v2.x
- Docker & Docker Compose（ローカル開発用）
- Supabase CLI（オプション）

### 開発環境セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/kazuya-m/urawa-support-hub.git
cd urawa-support-hub

# Docker開発環境を起動（Cloud Tasks Emulator含む）
deno task dev

# テスト実行
deno test --allow-env --allow-net=127.0.0.1

# 型チェック & Lint
deno task pre-commit
```

**開発環境に含まれるサービス**:

- アプリケーションコンテナ (ポート: 8080)
- Cloud Tasks Emulator (ポート: 8123) - 通知スケジューリングのローカルテスト用

### 開発コマンド

```bash
# 開発
deno task dev              # watchモードで起動
deno task dev:down         # コンテナ停止
deno task dev:logs         # ログ表示

# テスト
deno test --allow-env --allow-net=127.0.0.1  # 全テスト実行
deno task pre-commit       # 型チェック + Lint

# コード品質
deno fmt                   # コードフォーマット
deno check **/*.ts         # 型チェック
deno lint                  # Lintチェック
```

## プロジェクト構造

```
src/
├── adapters/                 # アダプター層
│   ├── controllers/          # HTTPコントローラー
│   ├── helpers/              # HTTPレスポンスビルダー
│   └── validators/           # リクエストバリデーター
├── application/              # アプリケーション層
│   ├── interfaces/           # インターフェース定義
│   └── usecases/             # ユースケース実装
├── domain/                   # ドメイン層
│   ├── entities/             # ビジネスエンティティ
│   ├── config/               # ドメイン設定
│   ├── services/             # ドメインサービス
│   └── types/                # ドメイン型定義
├── infrastructure/           # インフラ層
│   ├── clients/              # 外部サービスクライアント
│   ├── repositories/         # リポジトリ実装
│   ├── services/             # インフラサービス
│   │   ├── notification/     # 通知サービス
│   │   └── scraping/         # スクレイピングサービス
│   └── utils/                # インフラユーティリティ
├── config/                   # アプリケーション設定
├── middleware/               # ミドルウェア
└── shared/                   # 共有ユーティリティ
    ├── constants/            # 定数定義
    ├── errors/               # エラー定義
    ├── logging/              # Google Cloud Logging
    ├── testing/              # テストユーティリティ
    └── utils/                # 汎用ユーティリティ

tests/integration/            # 統合テスト
docs/                         # ドキュメント
```

## テスト

**テストカバレッジ**: 60+ テストケース

```bash
# 全テスト実行
deno test --allow-env --allow-net=127.0.0.1

# ユニットテストのみ
deno test src/

# 統合テスト
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# カバレッジレポート
deno test --coverage=coverage
deno coverage coverage
```

## CI/CD

### GitHub Actions

- ✅ Lint → 型チェック → テスト → カバレッジ
- ✅ Cloud Run & Supabaseへの自動デプロイ
- ✅ Supabase CLIによるデータベースマイグレーション

### 必要なシークレット

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GCP_PROJECT_ID
GCP_SERVICE_ACCOUNT_KEY
LINE_CHANNEL_ACCESS_TOKEN
```

詳細は[GitHub Secrets設定](docs/github-secrets-setup.md)を参照。

## 運用

### コスト効率

**目標**: 月額$0.00（無料枠のみ）

- **Google Cloud**: 無料枠（Cloud Run, Scheduler, Tasks, Logging）
- **Supabase**: 500MB DB（無料枠）
- **LINE**: 月1,000メッセージ（無料）

**実際の使用量**:

- Cloud Run: 約8,760回/月実行
- DB: < 10MB
- 通知: 約20 LINEメッセージ/月
- ログ: Cloud Logging無料枠内

### 監視

- **エラー追跡**: Google Cloud Logging構造化ログ
- **システムヘルスチェック**: 自動ヘルスチェック機能
- **通知失敗監視**: ログベースのエラー検出

## 開発ガイドライン

開発時は[実装ガイド](docs/implementation-guide.md)と[CLAUDE.md](CLAUDE.md)を参照してください。
