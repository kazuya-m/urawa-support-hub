# ドキュメント索引

このディレクトリには、urawa-support-hubプロジェクトの包括的なドキュメントが含まれています。

## 📚 必須ドキュメント（推奨読書順）

### 1. アーキテクチャ・設計

- **[システムアーキテクチャ](system-architecture.md)** - Google Cloud +
  Supabaseハイブリッド構成の完全設計
- **[実装ガイド](implementation-guide.md)** - コードパターン、実装例、ベストプラクティス
- **[クリーンアーキテクチャガイド](clean-architecture-guide.md)** -
  小規模プロジェクト向けクリーンアーキテクチャ

### 2. 開発・テスト

- **[セットアップガイド](setup-guide.md)** - 環境構築とデプロイ手順
- **[テストガイドライン](testing-guidelines.md)** - テスト戦略とパターン

### 3. 技術的意思決定

- **[技術選定](tech-selection.md)** - アーキテクチャ選定理由と代替案
- **[要件定義](requirements.md)** - 機能要件と非機能要件

### 4. 運用

- **[ログ仕様](logging-specification.md)** - Google Cloud Logging構造化ログ
- **[Issue優先度ロードマップ](issue-priority-roadmap.md)** - 開発フェーズと優先順位

### 5. セキュリティ

- **[GitHub Secrets設定](github-secrets-setup.md)** - CI/CD シークレット設定
- **[セキュリティドキュメント](security/)** - 認証・認可・RLSポリシー

## 🎯 コンテキスト別参照ガイド

現在のタスクに応じて、関連ドキュメントを素早く見つけるためのガイド：

| コンテキスト                 | 主要ドキュメント                                 | 補助ドキュメント                                            |
| ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| **設計・アーキテクチャ検討** | [システムアーキテクチャ](system-architecture.md) | [クリーンアーキテクチャガイド](clean-architecture-guide.md) |
| **実装パターン参照**         | [実装ガイド](implementation-guide.md)            | [テストガイドライン](testing-guidelines.md)                 |
| **技術選択・制約確認**       | [技術選定](tech-selection.md)                    | [要件定義](requirements.md)                                 |
| **セキュリティ実装**         | [security/](security/)                           | [GitHub Secrets設定](github-secrets-setup.md)               |
| **テスト戦略策定**           | [テストガイドライン](testing-guidelines.md)      | [クリーンアーキテクチャガイド](clean-architecture-guide.md) |
| **環境構築・デプロイ**       | [セットアップガイド](setup-guide.md)             | [GitHub Secrets設定](github-secrets-setup.md)               |

## 🌐 多言語サポート

- **English**: 主要言語 ([docs/](../))
- **日本語**: 副言語（このディレクトリ）

**更新ポリシー**: 常に英語版を先に更新し、その後日本語版を追従させます。

## 📋 追加リソース

### 専門トピック

- **[スクレイピング対象サイト構造](scraping-target-site-structure.md)** - Jリーグチケットサイト分析
- **[データ品質通知](issue-data-quality-notification.md)** - データ品質監視実装

### プロジェクト管理

- **[Issue優先度ロードマップ](issue-priority-roadmap.md)** - フェーズ別完全開発ロードマップ

## 🔍 クイックナビゲーション

**プロジェクト初見？** こちらから開始：

1. [システムアーキテクチャ](system-architecture.md) - ハイブリッド構成を理解
2. [セットアップガイド](setup-guide.md) - 環境を構築
3. [実装ガイド](implementation-guide.md) - コーディングパターンを学習

**機能実装中？** こちらを確認：

1. [実装ガイド](implementation-guide.md) - コード例とパターン
2. [テストガイドライン](testing-guidelines.md) - テストアプローチ
3. [クリーンアーキテクチャガイド](clean-architecture-guide.md) - アーキテクチャ原則

**本番デプロイ？** こちらに従う：

1. [セットアップガイド](setup-guide.md) - デプロイ手順
2. [GitHub Secrets設定](github-secrets-setup.md) - CI/CD設定
3. [セキュリティドキュメント](security/) - セキュリティベストプラクティス

## 📖 ドキュメント原則

[CLAUDE.md](../../CLAUDE.md)に記載の通り：

> ドキュメントは実装と運用の唯一の信頼できる情報源であり、実装履歴や移行ガイドではありません。

このディレクトリ内の全ドキュメントは以下の原則に従います：

- ✅ 現在の実装パターン
- ✅ 運用知識
- ✅ 技術仕様
- ❌ 実装プロセスの記述なし
- ❌ 歴史的背景なし
- ❌ 一時的な回避策なし
