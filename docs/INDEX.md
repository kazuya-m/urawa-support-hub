# ドキュメント索引

urawa-support-hub のドキュメント一覧です。ドキュメントは日本語で管理します。

## 📚 ドキュメント一覧

### 1. 開発・運用

- **[セットアップガイド](setup-guide.md)** - 環境構築とデプロイ手順
- **[GitHub Secrets設定](github-secrets-setup.md)** - CI/CD シークレット設定
- **[データベース自動クリーンアップ](database-cleanup.md)** - pg_cron による古いレコードの削除

### 2. 要件・技術選定

- **[要件定義](requirements.md)** - 機能要件と非機能要件
- **[技術選定](tech-selection.md)** - 構成の選定理由と代替案

### 3. セキュリティ

- **[セキュリティドキュメント](security/)** - 環境変数・サービスアカウント・RLS
  - [環境変数管理](security/environment-variable-management.md)
  - [GCP サービスアカウント権限](security/gcp-service-account-permissions.md)
  - [Supabase RLS 設定](security/supabase-rls-settings.md)

### 4. スクレイピング

- **[スクレイピング対象サイト構造](scraping-target-site-structure.md)** -
  Jリーグチケット・サンフレッチェ広島公式サイトの構造とセレクタ

### 5. 設計（移行中）

コードの層構成を簡素化する移行中（#204）のため、以下は現在のコードと異なる記述を含みます。移行完了後に
#215 で書き直します。

- [システムアーキテクチャ](system-architecture.md)
- [実装ガイド](implementation-guide.md)
- [クリーンアーキテクチャガイド](clean-architecture-guide.md)
- [テストガイドライン](testing-guidelines.md)
- [ログ仕様](logging-specification.md)

## 🎯 コンテキスト別参照ガイド

| コンテキスト           | 主要ドキュメント                                      | 補助ドキュメント                                       |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| **環境構築・デプロイ** | [セットアップガイド](setup-guide.md)                  | [GitHub Secrets設定](github-secrets-setup.md)          |
| **技術選択・制約確認** | [技術選定](tech-selection.md)                         | [要件定義](requirements.md)                            |
| **セキュリティ**       | [security/](security/)                                | [GitHub Secrets設定](github-secrets-setup.md)          |
| **データベース運用**   | [データベース自動クリーンアップ](database-cleanup.md) | [Supabase RLS 設定](security/supabase-rls-settings.md) |

## 🔍 クイックナビゲーション

**プロジェクト初見？** こちらから開始：

1. [README](../README.md) - システム構成の概要
2. [セットアップガイド](setup-guide.md) - 環境を構築
3. [要件定義](requirements.md) - 何を実現するシステムか

**本番デプロイ？** こちらに従う：

1. [セットアップガイド](setup-guide.md) - デプロイ手順
2. [GitHub Secrets設定](github-secrets-setup.md) - CI/CD設定
3. [セキュリティドキュメント](security/) - セキュリティベストプラクティス

## 📖 ドキュメント原則

[CLAUDE.md](../CLAUDE.md) の方針に従い、ドキュメントには現在の実装と運用を書きます。

- ✅ 現在の実装パターン、設定、運用手順
- ✅ 技術仕様
- ❌ 実装の経緯や移行手順
- ❌ 一時的な回避策
