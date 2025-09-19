# Issue Priority Roadmap

**Target**: Personal use MVP with minimal implementation\
**Created**: 2025-08-22\
**Updated**: 2025-09-19 (Issue #125, #126完了 + Issue #129, #130追加)\
**Goal**: ✅ Launch MVP by 2025-09-30 (**完了**: 2025-09-16)

## Implementation Status Summary

- **MVP完成**: 🎉 **全必須機能実装完了** (2025-09-16)
  - 基盤構築、外部サービス統合、スクレイピング、通知システム、CI/CD、本番環境構築すべて完了
  - Production deployment verification完了、システム正常稼働中
- **現在**: Post-MVP改善・機能拡張フェーズ
- **運用状況**: 自動チケット監視・LINE通知が稼働中

## Implementation Phases Overview

### Phase 1: Foundation Setup (3 days)

**Purpose**: Establish minimal development environment

| Issue | Title                                           | Priority    | Status           | Reason                                  |
| ----- | ----------------------------------------------- | ----------- | ---------------- | --------------------------------------- |
| #28   | Google Cloud Platform project and account setup | 🔴 Critical | ✅ **COMPLETED** | Prerequisites for all GCP services      |
| #29   | LINE Bot external service setup                 | 🔴 Critical | ✅ **COMPLETED** | Prerequisites for notification features |
| #17   | Environment variables and basic secrets setup   | 🔴 Critical | ✅ **COMPLETED** | Simplified security foundation          |
| #36   | Basic type definitions and entities             | 🔴 Critical | ✅ **COMPLETED** | Core domain models                      |
| #37   | Supabase client and repositories                | 🔴 Critical | ✅ **COMPLETED** | Data persistence layer                  |
| #39   | Minimal security configuration                  | 🔴 Critical | ✅ **COMPLETED** | Basic security requirements             |
| #40   | Initial database schema creation                | 🔴 Critical | ✅ **COMPLETED** | Database structure                      |

### Phase 2: Core Feature Implementation (4 days) - **UPDATED**

**Purpose**: Implement scraping, data integrity, and scheduling functionality

| Issue | Title                                                     | Priority    | Status           | Reason                            |
| ----- | --------------------------------------------------------- | ----------- | ---------------- | --------------------------------- |
| #38   | Playwright scraping implementation                        | 🔴 Critical | ✅ **COMPLETED** | Core data retrieval functionality |
| #12   | Ticket management application service implementation      | 🔴 Critical | ✅ **COMPLETED** | Core business logic               |
| #24   | Google Cloud Run scraping service implementation          | 🔴 Critical | ✅ **COMPLETED** | Container deployment              |
| #61   | **チケット重複処理・UPSERT機能実装** (**NEW**)            | 🔴 Critical | ✅ **COMPLETED** | **#25の前提条件・重複防止**       |
| #62   | **発売済みチケット状態管理・除外機能実装** (**NEW**)      | 🔴 Critical | ✅ **COMPLETED** | **#25の前提条件・無駄処理防止**   |
| #25   | Google Cloud Tasks notification scheduling implementation | 🔴 Critical | ✅ **COMPLETED** | Notification timing control       |
| #78   | **Cloud Tasks→Cloud Run LINE通知統合完全実装** (**NEW**)  | 🔴 Critical | ✅ **COMPLETED** | **#25統合完了・MVP必須**          |
| #26   | Cloud Scheduler daily execution setup implementation      | 🔴 Critical | ✅ **COMPLETED** | Automation requirements           |

### Phase 3: Notification Services (2 days)

**Purpose**: Implement notification delivery

| Issue | Title                                                      | Priority    | Status           | Reason                     |
| ----- | ---------------------------------------------------------- | ----------- | ---------------- | -------------------------- |
| #27   | LINE notification service implementation                   | 🔴 Critical | ✅ **COMPLETED** | Main notification channel  |
| #64   | Data quality monitoring via Cloud Logging                  | 🟠 High     | ✅ **COMPLETED** | Error monitoring via GCP   |
| #13   | Notification management application service implementation | 🔴 Critical | ✅ **COMPLETED** | Notification orchestration |

### Phase 4: Deployment (3 days) - **UPDATED**

**Purpose**: Production deployment and automated CI/CD

| Issue | Title                                            | Priority    | Status           | Reason                       |
| ----- | ------------------------------------------------ | ----------- | ---------------- | ---------------------------- |
| #33   | **GitHub Actions CI/CD Pipeline実装**            | 🔴 Critical | ✅ **COMPLETED** | **MVP自動デプロイ必須**      |
| #82   | **GCP本番環境構築・Service Account設定**         | 🔴 Critical | ✅ **COMPLETED** | **MVP認証・権限設定必須**    |
| #97   | **GitHub ActionsにSupabaseマイグレーション追加** | 🟠 High     | ✅ **COMPLETED** | **DBマイグレーション自動化** |
| #83   | **Production Deployment Verification**           | 🔴 Critical | ✅ **COMPLETED** | **MVP動作確認完了**          |

## Completed Issues (Additional implementations)

- **#9** - J-League ticket site web scraping service ✅
- **#10** - LINE Messaging API notification service ✅
- **#11** - Discord Webhook system monitoring ✅
- **#14** - Daily ticket scraping Edge Function ✅
- **#15** - Notification delivery Edge Function ✅
- **#16** - System health monitoring Edge Function ✅
- **#18** - End-to-end integration test suite ✅
- **#21** - Architecture documentation update ✅
- **#22** - External scraping environment implementation ✅
- **#31** - Notification service integration ✅
- **#32** - Database migration management ✅
- **#34** - Security and permission detailed design ✅
- **#27** - LINE APIエンドポイント設定統一化（2025-08-27品質改善） ✅
- **#70** - リポジトリレイヤーからビジネスロジックを分離し、Impl命名規則を統一 ✅
- **#24** - Google Cloud Run scraping service implementation ✅
- **#64** - Data quality monitoring via Cloud Logging ✅
- **#62** - 発売済みチケット状態管理・除外機能実装 ✅
- **#75** - 依存性注入（DI）パターン導入による単体テストの改善 ✅
- **#73** - NotificationStatusを'pending'から'scheduled'に変更 ✅
- **#78** - Cloud Tasks→Cloud Run LINE通知統合完全実装 ✅
- **#85** - スクレイピングデータ品質向上・日時精度改善実装 ✅
- **#33** - GitHub Actions CI/CD Pipeline実装 ✅
- **#82** - GCP本番環境構築・Service Account設定 ✅
- **#108** - チケット収集成功時の詳細ログ出力改善 ✅
- **#107** - match_dateタイムゾーンバグ修正（HOTFIX）✅
- **#104** - parseMatchDate関数JSTバグ修正（HOTFIX）✅
- **#97** - GitHub ActionsにSupabaseマイグレーション自動実行を追加 ✅
- **#83** - Production Deployment Verification ✅

## Development Progress Rules

### 1. Keep It Simple

- Minimal implementation for personal use
- No staging environment
- Direct deployment to production
- Manual testing acceptable

### 2. Branch Strategy

- **Pattern**: `feature/#<issue-number>_<description>`
- **Example**: `feature/#36_basic-types`

### 3. Completion Criteria

Each issue is considered complete when:

- [ ] Feature works
- [ ] `deno check` passes
- [ ] Manual test passes

## Milestones

### 🎉 MVP Launch ✅ **COMPLETED** (2025-09-16)

- **✅ Achieved**: Google Cloud統合・本番環境デプロイ完了
- **✅ Success Criteria**: 自動チケット監視・LINE/Discord通知システム稼働中
- **✅ 実績**: 目標より14日早期完成

### 📈 Post-MVP Phase (2025-09-17 ~)

- **Target**: 通知機能強化・セキュリティ向上・運用最適化
- **Priority**: ユーザビリティ改善・システム安定性向上

## Current Status (2025-09-19) - **Post-MVP改善フェーズ**

### ✅ MVP完成 - Completed Issues: 62+ (MVP全機能実装済み)

**Foundation & Infrastructure:**

- #28 - Google Cloud Platform project setup
- #29 - LINE Bot and Discord Webhook external setup
- #17 - Environment variables and basic secrets setup
- #36 - Basic type definitions and entities
- #37 - Supabase client and repositories
- #39 - Minimal security configuration
- #40 - Initial database schema creation

**Core Services:**

- #9 - J-League ticket site web scraping service
- #10 - LINE Messaging API notification service
- #11 - Discord Webhook system monitoring
- #14 - Daily ticket scraping Edge Function
- #15 - Notification delivery Edge Function
- #16 - System health monitoring Edge Function
- #27 - LINE notification service implementation
- #12 - Ticket management application service implementation
- #38 - Playwright scraping implementation
- #13 - Notification management application service implementation
- #61 - チケット重複処理・UPSERT機能実装
- #70 - リポジトリレイヤーからビジネスロジックを分離し、Impl命名規則を統一
- #25 - Google Cloud Tasks notification scheduling implementation
- #75 - 依存性注入（DI）パターン導入による単体テストの改善
- #73 - Notification status名称変更 (pending → scheduled)
- #24 - Google Cloud Run scraping service implementation
- #64 - Data quality monitoring via Cloud Logging
- #62 - 発売済みチケット状態管理・除外機能実装
- #78 - Cloud Tasks→Cloud Run LINE通知統合完全実装
- #26 - Cloud Scheduler daily execution setup implementation
- #85 - スクレイピングデータ品質向上・日時精度改善実装

**Testing & Documentation:**

- #18 - End-to-end integration test suite
- #21 - Architecture documentation update
- #22 - External scraping environment implementation
- #31 - Notification service integration
- #32 - Database migration management
- #34 - Security and permission detailed design

**Production Deployment:**

- #33 - GitHub Actions CI/CD Pipeline実装
- #82 - GCP本番環境構築・Service Account設定
- #49 - Supabase無料枠自動停止対策：毎日のヘルスチェック記録実装
- #51 - アーキテクチャ改善: servicesをinfrastructureからapplicationレイヤーに移動
- #53 - LINE通知をグループ配信からブロードキャスト配信に変更

### 🎉 **MVP COMPLETED** (2025-09-16)

**🚀 システム稼働状況**:

- ✅ 自動チケット監視システム稼働中
- ✅ LINE通知配信機能稼働中
- ✅ Cloud Run + Cloud Scheduler自動実行
- ✅ CI/CD自動デプロイ機能稼働中
- ✅ エラー監視・Discord通知稼働中

### 🔧 **最近の追加実装** (2025-09-15～17):

- #112 - 本番環境でCloud Tasks→LINE通知の全フローテスト実装 ✅
- #108 - チケット収集成功時の詳細ログ出力改善 ✅
- #107 - match_dateタイムゾーンバグ修正（HOTFIX）✅
- #104 - parseMatchDate関数JSTバグ修正（HOTFIX）✅
- #100 - チケット情報取得・LINE用フォーマット機能実装 ✅
- #99 - Cloud RunにLINE Webhookエンドポイント実装 ✅
- #97 - GitHub ActionsにSupabaseマイグレーション追加 ✅
- #83 - Production Deployment Verification ✅
- #82 - GCP本番環境構築・Service Account設定 ✅
- #80 - Cloud Run APIエンドポイントのセキュリティ強化 ✅
- #64 - スクレイピングデータ品質監視・Discord通知機能 ✅

### 📈 **現在の開発フェーズ**: Post-MVP改善・機能拡張

## 🚨 Active Issues - 優先順位別

### 🔴 **CRITICAL - 技術的負債・バグ修正** (最優先)

| Issue | Title                                                                             | Reason                     | Status           |
| ----- | --------------------------------------------------------------------------------- | -------------------------- | ---------------- |
| #125  | 日時ライブラリ導入によるタイムゾーン処理の改善                                    | タイムゾーンバグの根本解決 | ✅ **COMPLETED** |
| #126  | 通知スケジュール管理の不整合とカラム名改善                                        | データ整合性の改善         | ✅ **COMPLETED** |
| #130  | PostgreSQL セキュリティパッチ適用のためのデータベースアップグレード               | セキュリティ維持           | 🆕 New           |
| #129  | notificationsテーブルのnotification_scheduledカラム冗長性解決とスキーマ整合性修正 | データベース設計改善       | 🆕 New           |

### 🟠 **HIGH - 機能拡張・品質改善**

| Issue | Title                                               | Category     | Status |
| ----- | --------------------------------------------------- | ------------ | ------ |
| #101  | 月初チケット一覧送信機能実装                        | 通知機能強化 | Open   |
| #119  | 構造化ログへの統一: String(error)パターンを置き換え | コード品質   | Open   |
| #50   | 本番環境セキュリティ強化：RLSポリシー導入           | セキュリティ | Open   |

### 🟡 **MEDIUM - 運用最適化** (Phase 5)

| Issue | Title                                  | Category       | Status |
| ----- | -------------------------------------- | -------------- | ------ |
| #72   | データベースへのクエリ回数を最適化する | パフォーマンス | Open   |
| #68   | データベース履歴とGCPログの料金最適化  | コスト削減     | Open   |
| #86   | スクレイピング最適化検討               | パフォーマンス | Open   |
| #84   | Playwright scraperのmock化対応         | テスト改善     | Open   |

### 🟢 **LOW - 機能拡張**

| Issue | Title                      | Category     | Status        |
| ----- | -------------------------- | ------------ | ------------- |
| #67   | ヴィッセル神戸対応         | 他チーム対応 | Open          |
| #66   | サンフレッチェ広島対応     | 他チーム対応 | 🔴 **URGENT** |
| #105  | 2026年シーズン制度変更対応 | 長期計画     | Open          |

## Next Steps Priority (**UPDATED: 2025-09-19**)

### 🎯 **推奨実装順序**

#### 📍 **今すぐ対応すべき** (緊急・技術的負債)

1. **#130** - PostgreSQL セキュリティパッチ適用のためのデータベースアップグレード 🔴 **NEW**
   - **理由**: セキュリティ脆弱性対応・本番環境の安全性確保
   - **影響**: システム全体のセキュリティ向上
   - **期限**: セキュリティパッチの緊急性による

2. **#129** - notificationsテーブルのnotification_scheduledカラム冗長性解決とスキーマ整合性修正 🔴
   **NEW**
   - **理由**: データベース設計の改善・データ整合性確保
   - **影響**: 通知機能の信頼性とメンテナンス性向上

3. **✅ #125** - 日時ライブラリ導入によるタイムゾーン処理の改善 **COMPLETED**
   - **理由**: タイムゾーンバグ(#104, #107)の根本解決
   - **影響**: 全機能の日時処理の信頼性向上
   - **実装**: date-fns v4 + @date-fns/tz導入、共通timezone utilities作成、100%テストカバレッジ

4. **✅ #126** - 通知スケジュール管理の不整合とカラム名改善 **COMPLETED**
   - **理由**: データ整合性の確保
   - **影響**: 通知機能の安定性向上

#### 📍 **次に実装** (機能強化・品質改善)

5. **#119** - 構造化ログへの統一 🟠
   - **理由**: エラー監視とデバッグ効率の向上
   - **影響**: 運用保守性の大幅改善

6. **#101** - 月初チケット一覧送信機能実装 🟠
   - **理由**: ユーザビリティ向上
   - **影響**: 月次のチケット情報把握が容易に

7. **#50** - 本番環境セキュリティ強化：RLSポリシー導入 🟠
   - **理由**: セキュリティ強化
   - **影響**: データアクセス制御の厳密化

#### 📍 **余裕があれば** (最適化・拡張)

8. **#72** - データベースクエリ最適化 🟡
9. **#68** - GCPログ料金最適化 🟡
10. **#86** - スクレイピング最適化 🟡
11. **#84** - Playwright scraper mock化 🟡

#### 📍 **将来対応** (長期計画)

12. **#105** - 2026年シーズン制度変更対応 🟢 (2026年2月まで)
13. **#67** - ヴィッセル神戸対応 🟢

## Progress Tracking

```bash
# Check progress by phase
gh issue list --label "phase-1-foundation" --state "open"
gh issue list --label "phase-2-core" --state "open"
gh issue list --label "phase-3-notification" --state "open"

# Check overall progress
gh issue list --state "open"

# Check completed
gh issue list --state "closed"
```
