# Issue Priority Roadmap

**Target**: Personal use MVP with minimal implementation\
**Created**: 2025-08-22\
**Updated**: 2025-09-09 (Issue #78 完了)\
**Goal**: Launch MVP by 2025-09-30

## Implementation Status Summary

- **Completed**: Foundation setup, external services, domain models, database schema, notification
  services, application layer, Cloud Tasks notification scheduling (#25), Cloud Run deployment
  (#24), Discord notifications (#30), Sale Status Management (#62), Dependency Injection Pattern
  (#75), Notification status change (#73), Cloud Tasks→Cloud Run notification integration (#78)
- **In Progress**: Nothing currently in progress
- **Not Started**: Cloud Scheduler daily execution, data quality monitoring

## Implementation Phases Overview

### Phase 1: Foundation Setup (3 days)

**Purpose**: Establish minimal development environment

| Issue | Title                                               | Priority    | Status           | Reason                                  |
| ----- | --------------------------------------------------- | ----------- | ---------------- | --------------------------------------- |
| #28   | Google Cloud Platform project and account setup     | 🔴 Critical | ✅ **COMPLETED** | Prerequisites for all GCP services      |
| #29   | LINE Bot and Discord Webhook external service setup | 🔴 Critical | ✅ **COMPLETED** | Prerequisites for notification features |
| #17   | Environment variables and basic secrets setup       | 🔴 Critical | ✅ **COMPLETED** | Simplified security foundation          |
| #36   | Basic type definitions and entities                 | 🔴 Critical | ✅ **COMPLETED** | Core domain models                      |
| #37   | Supabase client and repositories                    | 🔴 Critical | ✅ **COMPLETED** | Data persistence layer                  |
| #39   | Minimal security configuration                      | 🔴 Critical | ✅ **COMPLETED** | Basic security requirements             |
| #40   | Initial database schema creation                    | 🔴 Critical | ✅ **COMPLETED** | Database structure                      |

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
| #26   | Cloud Scheduler daily execution setup implementation      | 🔴 Critical | ❌ Not Started   | Automation requirements           |

### Phase 3: Notification Services (2 days)

**Purpose**: Implement notification delivery

| Issue | Title                                                      | Priority    | Status           | Reason                     |
| ----- | ---------------------------------------------------------- | ----------- | ---------------- | -------------------------- |
| #27   | LINE notification service implementation                   | 🔴 Critical | ✅ **COMPLETED** | Main notification channel  |
| #30   | Discord error notification implementation                  | 🟠 High     | ✅ **COMPLETED** | Error alerts only          |
| #13   | Notification management application service implementation | 🔴 Critical | ✅ **COMPLETED** | Notification orchestration |

### Phase 4: Deployment (2 days)

**Purpose**: Automated deployment and testing

| Issue | Title               | Priority    | Status         | Reason                  |
| ----- | ------------------- | ----------- | -------------- | ----------------------- |
| #33   | Minimal CI/CD setup | 🟠 High     | ❌ Not Started | Post-launch improvement |
| -     | Manual testing      | 🔴 Critical | ❌ Not Started | Final verification      |

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
- **#30** - Discord error notification implementation ✅
- **#62** - 発売済みチケット状態管理・除外機能実装 ✅
- **#75** - 依存性注入（DI）パターン導入による単体テストの改善 ✅
- **#73** - NotificationStatusを'pending'から'scheduled'に変更 ✅
- **#78** - Cloud Tasks→Cloud Run LINE通知統合完全実装 ✅

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
- **Remaining**: 3 issues (8% of total scope) - **UPDATED**

## Current Status (2025-09-09) - **UPDATED**

### ✅ Completed Issues: 35/38 (92%)

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
- **#24 - Google Cloud Run scraping service implementation**
- **#30 - Discord error notification implementation**
- **#62 - 発売済みチケット状態管理・除外機能実装**
- **#78 - Cloud Tasks→Cloud Run LINE通知統合完全実装**

**Testing & Documentation:**

- #18 - End-to-end integration test suite
- #21 - Architecture documentation update
- #22 - External scraping environment implementation
- #31 - Notification service integration
- #32 - Database migration management
- #34 - Security and permission detailed design

### ❌ Not Started: 3/38 (8%)

**Critical for MVP Launch:**

- #26 - Cloud Scheduler daily execution setup

**Optimization & Improvements:**

- #72 - データベースへのクエリ回数を最適化する
- #68 - データベース履歴とGCPログの料金最適化
- #64 - スクレイピングデータ品質監視・Discord通知機能実装

**Post-Launch Improvements:**

- #67 - ヴィッセル神戸オフィシャルサイト対応 (Phase 5)
- #66 - サンフレッチェ広島オフィシャルサイト対応 (Phase 5)
- #50 - 本番環境セキュリティ強化：RLSポリシー導入 (Phase 4)
- #33 - 最小限CI/CDセットアップ (Phase 5)

## Next Steps Priority (**UPDATED: 2025-09-09**)

1. **#26** - Cloud Scheduler daily execution setup 🔴 **MVPローンチ必須**
2. **#64** - スクレイピングデータ品質監視・Discord通知機能実装 🟠 品質向上
3. **#72** - データベースへのクエリ回数を最適化する 🟡 コスト最適化
4. **#68** - データベース履歴とGCPログの料金最適化 🟡 コスト最適化

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
