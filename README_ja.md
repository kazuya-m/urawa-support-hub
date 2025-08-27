# urawa-support-hub

浦和レッズサポーター向けアウェイ戦チケット販売情報自動通知システム

> **Clean Architecture** | **包括的テスト** | **自動CI/CD**

## 概要

Jリーグチケットサイトから浦和レッズアウェイ戦チケット情報を自動取得し、販売開始をLINE通知するシステムです。

### システム機能

- **Domain Layer**: Ticket, NotificationHistory エンティティ（ビジネスロジック含有）
- **Infrastructure Layer**: Repository パターン実装
- **設定駆動設計**: NOTIFICATION_TIMING_CONFIG による運用時変更対応
- **統合テスト**: エンティティ、リポジトリ、統合の包括的テストカバレッジ
- **CI/CDパイプライン**: GitHub Actions 自動ワークフロー
- **エラーハンドリング**: 統一エラー処理インフラ

## アーキテクチャ

### Clean Architecture 構成

```
┌─────────────────────────────────────┐
│     Edge Functions (Interface)     │  ← daily-check, notification-check
├─────────────────────────────────────┤
│      Application Services          │  ← ScrapingService, NotificationService  
├─────────────────────────────────────┤
│        Domain Layer                │  ← Entities: Ticket, NotificationHistory
│                                     │    Interfaces: TicketRepository
├─────────────────────────────────────┤
│     Infrastructure Layer           │  ← RepositoryImpl, Supabase Client
└─────────────────────────────────────┘
```

### ディレクトリ構造

```
src/
├── domain/                    # ドメイン層
│   ├── entities/             # ビジネスエンティティ（Class）
│   │   ├── Ticket.ts         # チケットエンティティ + ビジネスロジック
│   │   ├── NotificationHistory.ts
│   │   └── __tests__/        # エンティティ単体テスト
│   └── interfaces/           # リポジトリインターフェース
├── infrastructure/           # インフラ層  
│   ├── repositories/         # リポジトリ実装
│   │   ├── TicketRepositoryImpl.ts
│   │   ├── converters/       # DB↔Domain変換
│   │   └── __tests__/        # リポジトリ単体テスト
│   └── utils/                # インフラ共通処理
└── tests/integration/        # 統合テスト
```

## 技術スタック

- **Runtime**: Deno + TypeScript
- **Database**: Supabase PostgreSQL
- **Functions**: Supabase Edge Functions
- **Scraping**: Playwright
- **Notifications**: LINE Messaging API + Discord Webhook
- **Scheduler**: pg_cron
- **CI/CD**: GitHub Actions（最適化済み）

## ドキュメント

設計・要件などの詳細ドキュメントは `/docs` ディレクトリに整備されています。

- [要件定義書](docs/要件定義書.md)
- [技術選定書](docs/技術選定書.md) - 実装状況更新済み
- [基本設計書](docs/基本設計書.md) - Clean Architecture反映済み
- [詳細設計書](docs/詳細設計書.md) - 実装エンティティ反映済み
- [アーキテクチャ設計書](docs/アーキテクチャ設計書.md) - 実装構成反映済み
- [環境設定書](docs/環境設定書.md) - 現在の環境に更新済み

## 開発環境セットアップ

### 1. 前提条件

- **Deno** v2.x
- **Supabase CLI**

```bash
# Deno インストール
curl -fsSL https://deno.land/install.sh | sh

# Supabase CLI インストール
npm install -g supabase
```

### 2. プロジェクトセットアップ

```bash
# リポジトリクローン
git clone https://github.com/kazuya-m/urawa-support-hub.git
cd urawa-support-hub

# Supabaseローカル環境起動
supabase start

# 依存関係確認
deno check **/*.ts
```

### 3. テスト実行

```bash
# 全テスト実行（45ケース）
deno test --allow-env --allow-net=127.0.0.1 --coverage=coverage

# 単体テストのみ
deno test src/ --coverage=coverage

# 統合テストのみ  
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# 型チェック
deno check src/

# Lintチェック
deno lint src/
```

### 4. 開発コマンド

```bash
# ローカル開発サーバー起動
supabase functions serve

# データベースリセット
supabase db reset

# フォーマット
deno fmt

# テストカバレッジ表示
deno coverage coverage
```

## CI/CD

### GitHub Actions 最適化済み

- **1ジョブ構成**: lint → test → coverage を効率的に実行
- **GitHub Secrets**: 環境変数をSecure管理
- **最小権限**: `--allow-env --allow-net=127.0.0.1` でセキュリティ強化

### 必要なGitHub Secrets

```
SUPABASE_URL: https://your-project.supabase.co
SUPABASE_ANON_KEY: your-anon-key
SUPABASE_SERVICE_ROLE_KEY: your-service-role-key
```

## テスト

### テスト構成（45ケース）

- **エンティティテスト**: 19ケース（Ticket: 8, NotificationHistory: 11）
- **リポジトリテスト**: 17ケース（TicketRepo: 9, NotificationRepo: 8）
- **統合テスト**: 9ケース（Repository操作全般）

### テスト実行権限

```bash
# ✅ 推奨: 最小権限
deno test --allow-env --allow-net=127.0.0.1

# ❌ 非推奨: 全権限
deno test --allow-all
```

## 運用

### 無料枠内運用

- **Supabase**: DB 500MB + Functions 500,000回/月
- **LINE Messaging API**: 1,000通/月
- **Discord Webhook**: 無制限

### 推定使用量

- DB使用量: 10MB未満
- Functions実行: 約8,760回/月
- 通知送信: 約20通/月（LINE）+ 50通/月（Discord監視）

**総コスト: $0.00/月（全て無料枠内）**
