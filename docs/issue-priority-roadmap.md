# Issue Priority Roadmap

**Target**: Personal use MVP with minimal implementation\
**Created**: 2025-08-22\
**Updated**: 2025-09-17 (チケット収集成功時の詳細ログ出力改善 #108 completed)\
**Goal**: Launch MVP by 2025-09-30

## Implementation Status Summary

- **Completed**: Foundation setup, external services, domain models, database schema, notification
  services, application layer, Cloud Tasks notification scheduling (#25), Cloud Run deployment
  (#24), Cloud Logging-based monitoring (#64), Sale Status Management (#62), Dependency Injection
  Pattern (#75), Notification status change (#73), Cloud Tasks→Cloud Run notification integration
  (#78), System architecture refactoring, error handling unification, CI/CD pipeline (#33), GCP
  production setup (#82), Data quality improvement (#85)
- **In Progress**: Production deployment verification
- **Not Started**: Post-MVP improvements and optimizations

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
| #83   | **Production Deployment Verification**           | 🔴 Critical | 🔄 In Progress   | **MVP動作確認必須**          |

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

### MVP Launch (Target: 2025-09-30)

- **Target**: Complete Google Cloud integration and production deployment
- **Success Criteria**: Automated daily ticket monitoring with LINE/Discord notifications
- **Remaining**: 2 issues (5% of total scope) - **UPDATED**

## Current Status (2025-09-15) - **UPDATED**

### ✅ Completed Issues: 41/43 (95%)

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

### 🔄 In Progress: 2/43 (5%)

**MVP Final Steps:**

- #97 - GitHub ActionsにSupabaseマイグレーション自動実行を追加
- #83 - Production Deployment Verification

### ⏳ Post-MVP Improvements (Phase 5): 7 issues

**Optimization & Cost Reduction:**

- #72 - データベースへのクエリ回数を最適化する
- #68 - データベース履歴とGCPログの料金最適化
- #80 - Cloud Run APIエンドポイントのセキュリティ強化
- #50 - 本番環境セキュリティ強化：RLSポリシー導入

**Feature Enhancements:**

- #67 - ヴィッセル神戸オフィシャルサイト対応
- #66 - サンフレッチェ広島オフィシャルサイト対応
- #86 - スクレイピング最適化検討：サイト負荷軽減を優先した詳細ページアクセス改善
- #84 - Playwright scraperのmock化対応

## Next Steps Priority (**UPDATED: 2025-09-15**)

**MVP Final Steps:**

1. **#97** - GitHub ActionsにSupabaseマイグレーション自動実行を追加 🔴 **DBマイグレーション自動化**
2. **#83** - Production Deployment Verification 🔴 **動作確認必須**

**Post-MVP Optimization (Phase 5):**

3. **#72** - データベースへのクエリ回数を最適化する 🟡 コスト最適化
4. **#68** - データベース履歴とGCPログの料金最適化 🟡 コスト最適化
5. **#80** - Cloud Run APIエンドポイントのセキュリティ強化 🟠 セキュリティ向上
6. **#50** - 本番環境セキュリティ強化：RLSポリシー導入 🟠 セキュリティ向上

**Post-MVP Enhancements:**

7. **#86** - スクレイピング最適化検討 🟢 パフォーマンス改善
8. **#84** - Playwright scraperのmock化対応 🟢 テスト改善
9. **#67** - ヴィッセル神戸対応 🟢 機能拡張
10. **#66** - サンフレッチェ広島対応 🟢 機能拡張

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
