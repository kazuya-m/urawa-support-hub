# Issue Priority Roadmap

**Target**: Personal use MVP with minimal implementation\
**Created**: 2025-08-22\
**Updated**: 2025-11-11 (最新状況: #189 sold_outステータス実装完了)\
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
- **#14** - Daily ticket scraping implementation ✅
- **#15** - Notification delivery implementation ✅
- **#16** - System health monitoring implementation ✅
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
- **#72** - データベースへのクエリ回数を最適化する（N+1問題解決）✅
- **#165** - createdAt/updatedAtの管理をデータベース側に移行する ✅

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
- **✅ Success Criteria**: 自動チケット監視・LINE通知システム稼働中
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
- ✅ エラー監視・Cloud Logging稼働中

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

### ✅ **最近完了・クローズしたイシュー (2025-11-09)**:

- #189 - Jリーグチケットサイトで「空席なし」表示時にsold_outステータスを設定する ✅ **NEW -
  スクレイピング精度向上**
- #182 - Ticket Entityのupsert改善：既存値保持と差分更新ロジックの実装 ✅ **NEW - データ整合性向上**
- #181 - SaleStatusServiceのリファクタリング：サイト固有フォーマットを分離 ✅ **NEW -
  アーキテクチャ改善**
- #177 - スクレイパー間でのログ出力戦略の一貫性を確保 ✅ **コード品質改善**
- #184 - collect-ticketがエラー ✅ **HOTFIX完了**
- #179 - [BUG] サンフレッチェ広島のチケット販売状況が「発売中」に更新されない ✅
- #176 - Ticketエンティティのoptionalプロパティをnullに統一 ✅
- #173 - スクレイピング並行実行時のBrowserManager共有による競合問題 ✅
- #172 - ドキュメント構造の整理とREADME.md最適化 ✅
- #168 - 開発環境でのwatch機能とプロダクション環境でのテストモード機能の両立実装 ✅
- #161 - スクレイピング更新時のnotification_scheduledフィールド上書き問題を修正 ✅
- #160 - チケット更新時の差分ログ出力機能を実装 ✅
- #158 - エラーログ自動通知システムの実装 ✅
- #157 - 不要なPostgreSQL functionsとcron jobsを削除してアーキテクチャを統一 ✅
- #155 - SendTicketSummaryUseCaseのクリーンアーキテクチャ違反を修正：Application層Service導入 ✅
- #152 - YAGNI: 未使用コードとエンドポイントの削除 ✅
- #150 - インフラ層のスクレイピング関連ディレクトリ構造を統合 ✅
- #149 - 広島スクレイパーの複数の問題：エラーハンドリング、SaleStatusUtils未使用、会場警告 ✅
- #140 - Cloud Scheduler月次実行を月初20時に変更 ✅
- #137 - 通知システムの改善: sent_atの誤更新修正とupdated_at追加 ✅
- #135 - notificationsテーブルの命名不整合を修正 ✅
- #131 - LINEメッセージの試合日時と販売開始日時をJST表示に修正 ✅
- #130 - PostgreSQL セキュリティパッチ適用のためのデータベースアップグレード ✅
- #129 - notificationsテーブルのnotification_scheduledカラム冗長性解決 ✅
- #101 - 月初チケット一覧送信機能実装（Cloud Scheduler + LINE通知）✅

## 🚨 Active Issues - 優先順位別

### 🔴 **HIGH PRIORITY - バグ修正・機能拡張**

| Issue | Title                                                                | Category           | Priority    | Status           |
| ----- | -------------------------------------------------------------------- | ------------------ | ----------- | ---------------- |
| #184  | collect-ticketがエラー                                               | スクレイピングバグ | 🔴 Critical | ✅ **COMPLETED** |
| #182  | Ticket Entityのupsert改善：既存値保持と差分更新ロジックの実装        | 機能改善           | 🟠 High     | ✅ **COMPLETED** |
| #179  | [BUG] サンフレッチェ広島のチケット販売状況が「発売中」に更新されない | スクレイピングバグ | 🔴 Critical | ✅ **COMPLETED** |
| #171  | 開発環境でのCloudTasksモック実装                                     | 開発効率改善       | 🟠 High     | 🚨 **OPEN**      |

### ✅ **COMPLETED - 技術的負債・バグ修正**

| Issue | Title                                                                                | Reason                                         | Status           |
| ----- | ------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------- |
| #173  | スクレイピング並行実行時のBrowserManager共有による競合問題                           | **並行処理バグ・システム安定性向上**           | ✅ **COMPLETED** |
| #172  | ドキュメント構造の整理とREADME.md最適化                                              | ドキュメント整理・プロジェクト可読性向上       | ✅ **COMPLETED** |
| #155  | SendTicketSummaryUseCaseのクリーンアーキテクチャ違反を修正：Application層Service導入 | **クリーンアーキテクチャ原則違反の修正**       | ✅ **COMPLETED** |
| #152  | YAGNI: 未使用コードとエンドポイントの削除                                            | コード品質向上・メンテナンス性改善             | ✅ **COMPLETED** |
| #150  | インフラ層のスクレイピング関連ディレクトリ構造を統合                                 | アーキテクチャ整理・構造統一                   | ✅ **COMPLETED** |
| #149  | 広島スクレイパーの複数の問題：エラーハンドリング、SaleStatusUtils未使用、会場警告    | **システム停止リスク・ドメインロジック不整合** | ✅ **COMPLETED** |
| #125  | 日時ライブラリ導入によるタイムゾーン処理の改善                                       | タイムゾーンバグの根本解決                     | ✅ **COMPLETED** |
| #126  | 通知スケジュール管理の不整合とカラム名改善                                           | データ整合性の改善                             | ✅ **COMPLETED** |
| #131  | LINEメッセージの試合日時と販売開始日時をJST表示に修正                                | ユーザビリティ改善                             | ✅ **COMPLETED** |
| #135  | notificationsテーブルの命名不整合を修正                                              | データベース設計改善                           | ✅ **COMPLETED** |
| #137  | 通知システムの改善: sent_atの誤更新修正とupdated_at追加                              | データ整合性向上                               | ✅ **COMPLETED** |
| #130  | PostgreSQL セキュリティパッチ適用のためのデータベースアップグレード                  | セキュリティ維持                               | ✅ **COMPLETED** |
| #129  | notificationsテーブルのnotification_scheduledカラム冗長性解決とスキーマ整合性修正    | データベース設計改善                           | ✅ **COMPLETED** |
| #157  | 不要なPostgreSQL functionsとcron jobsを削除してアーキテクチャを統一                  | アーキテクチャ統一・リファクタリング           | ✅ **COMPLETED** |

### 🟡 **MEDIUM - 運用最適化** (Phase 5)

| Issue | Title                                                             | Category       | Status           |
| ----- | ----------------------------------------------------------------- | -------------- | ---------------- |
| #181  | SaleStatusServiceのリファクタリング：サイト固有フォーマットを分離 | リファクタ     | ✅ **COMPLETED** |
| #86   | スクレイピング最適化検討：サイト負荷軽減を優先した改善            | パフォーマンス | 🚨 **OPEN**      |
| #68   | データベース履歴とGCPログの料金最適化                             | コスト削減     | 🚨 **OPEN**      |
| #84   | Playwright scraperのmock化対応                                    | テスト改善     | 🚨 **OPEN**      |
| #176  | Ticketエンティティのoptionalプロパティをnullに統一                | リファクタ     | ✅ **COMPLETED** |

### 🟢 **LOW - 機能拡張・運用改善**

| Issue | Title                                            | Category        | Status                            |
| ----- | ------------------------------------------------ | --------------- | --------------------------------- |
| #177  | スクレイパー間でのログ出力戦略の一貫性を確保     | コード品質改善  | ✅ **COMPLETED**                  |
| #165  | createdAt/updatedAtの管理をデータベース側に移行  | Phase 5運用改善 | ✅ **COMPLETED**                  |
| #164  | Ticketエンティティのデフォルト値設定を一元化する | コード品質改善  | ❌ **WON'T FIX**                  |
| #67   | ヴィッセル神戸対応                               | 他チーム対応    | 🔄 **DEFERRED** (2026年1-2月実装) |
| #105  | 2026年シーズン制度変更対応                       | 長期計画        | 🔄 **DEFERRED** (2026年2月まで)   |

## Next Steps Priority (**UPDATED: 2025-12-22**)

### 🎯 **推奨実装順序**

#### 📍 **最近完了**

- **#193** - データベースレコードの自動クリーンアップ機能実装 ✅ **COMPLETED**
  - **内容**: tickets (試合日+30日後) / notifications (送信+90日後) の自動削除
  - **効果**: データベース肥大化防止・運用コスト削減

#### 📍 **高優先タスク** (機能改善・開発効率)

1. **#171** - 開発環境でのCloudTasksモック実装 🟠 **HIGH PRIORITY**
   - **内容**: ローカル開発環境でのCloud Tasksモック機能実装
   - **期待効果**: 開発効率改善・テスト環境統一
   - **状態**: 🚨 **OPEN**

#### 📍 **中優先タスク** (運用改善・パフォーマンス)

2. **#86** - スクレイピング最適化 🟡
   - **内容**: サイト負荷軽減を優先した詳細ページアクセス改善
   - **期待効果**: 安定性向上・サイト負荷軽減

3. **#68** - GCPログ料金最適化 🟡
   - **内容**: 古いログ・履歴データの自動削除設定
   - **期待効果**: 運用コスト削減

4. **#84** - Playwright scraper mock化 🟡
   - **内容**: テスト環境でのscraper mock化実装
   - **期待効果**: テスト改善・CI/CD高速化

#### 📍 **Won't Fix** (実装不要)

~~**#164** - Ticketエンティティのデフォルト値設定を一元化する~~

- **理由**: 元々の課題（getter内デフォルト値分散）は既に別の方法で解決済み
- **詳細**:
  `notificationScheduled`は型が非null化、`saleStatus`はデフォルト値削除済み、`ticketTypes`はビジネス要件によりnull許容が必須

#### 📍 **将来対応** (長期計画・来年以降)

5. **#67** - ヴィッセル神戸対応 🟢
   - **延期理由**: 現在販売中チケットのみで販売前DOMパターンが不明
   - **実装時期**: 2026年1-2月（新規チケット販売開始時）

6. **#105** - 2026年シーズン制度変更対応 🟢 (2026年2月まで)

## Issue Label Management Strategy

### 🏷️ **推奨ラベル体系**

**優先度ラベル**:

- `priority/critical` - システム停止・セキュリティ問題
- `priority/high` - 機能改善・パフォーマンス向上
- `priority/medium` - 運用最適化・コスト削減
- `priority/low` - 将来機能・長期計画

**実装時期ラベル**:

- `immediate` - 即座に実装可能
- `deferred/2026-q1` - 2026年1-2月実装予定
- `deferred/long-term` - 長期計画

**カテゴリラベル**:

- `enhancement` - 機能拡張
- `performance` - パフォーマンス改善
- `cost-optimization` - コスト最適化
- `testing` - テスト改善

### 🎯 **現在のissueラベル適用推奨**

| Issue | 推奨ラベル                                          |
| ----- | --------------------------------------------------- |
| #158  | `priority/high`, `enhancement`, `immediate`         |
| #72   | `priority/high`, `performance`, `immediate`         |
| #68   | `priority/medium`, `cost-optimization`, `immediate` |
| #86   | `priority/medium`, `performance`, `immediate`       |
| #84   | `priority/medium`, `testing`, `immediate`           |
| #67   | `priority/low`, `enhancement`, `deferred/2026-q1`   |
| #105  | `priority/low`, `enhancement`, `deferred/long-term` |

## Progress Tracking

```bash
# Check progress by priority
gh issue list --label "priority/critical" --state "open"
gh issue list --label "priority/high" --state "open"
gh issue list --label "priority/medium" --state "open"

# Check progress by implementation timing
gh issue list --label "immediate" --state "open"
gh issue list --label "deferred/2026-q1" --state "open"

# Check overall progress
gh issue list --state "open"
```
