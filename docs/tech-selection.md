# 技術選定書

## 結論: 現在の構成

| 役割                 | 採用技術                                                         |
| -------------------- | ---------------------------------------------------------------- |
| アプリケーション実行 | Google Cloud Run（単一サービス。スクレイピングと通知送信の両方） |
| 日次・月次の起動     | Google Cloud Scheduler                                           |
| 通知の時刻指定実行   | Google Cloud Tasks                                               |
| データベース         | Supabase PostgreSQL                                              |
| 古いレコードの削除   | pg_cron（Supabase PostgreSQL 内）                                |
| スクレイピング       | Playwright（Chromium）                                           |
| ユーザー通知         | LINE Messaging API（ブロードキャスト）                           |
| ログ                 | Google Cloud Logging（構造化ログ）                               |
| ランタイム           | Deno + TypeScript                                                |
| CI/CD                | GitHub Actions                                                   |

Supabase Edge Functions は使っていません。下記の比較のとおり、スクレイピングと通知送信の実行環境には
Cloud Run を選びました。

## コア技術スタック

### 実行環境

- **Deno + TypeScript**: TypeScript を標準でサポートするランタイム
- **理由**: 型安全性、権限モデルによる安全なデフォルト、`deno fmt` / `deno lint` / `deno test`
  の標準ツール
- **用途**: 全アプリケーションロジック（Cloud Run 上のサービス）とスクリプト

### Google Cloud Platform

- **Google Cloud Run**: コンテナで Playwright と通知送信を実行
- **Google Cloud Scheduler**: 日次のチケット収集と月次のサマリー送信を起動
- **Google Cloud Tasks**: 販売開始前の指定時刻に通知送信エンドポイントを呼ぶ
- **理由**: Playwright に十分なメモリと実行時間、OIDC
  による呼び出し元の認証、組み込みのリトライ、無料枠

### Supabase

- **Supabase PostgreSQL**: チケットと通知の保存
- **理由**:
  - 無料枠
  - 行レベルセキュリティ（RLS）
  - マイグレーション管理（Supabase CLI）
  - pg_cron による DB 内の定期削除

### ウェブスクレイピング

- **Playwright**: ブラウザ自動化ライブラリ
- **実行環境**: Google Cloud Run
- **理由**:
  - JavaScript で描画されるページを扱える
  - Cloud Run で十分なリソース（2GB メモリ、300 秒タイムアウト）を確保できる
  - コンテナにブラウザを同梱してデプロイできる

### 通知サービス

- **LINE Messaging API**: Bot のフォロワー全員へのブロードキャスト
- **理由**: 対象ユーザー（サポーター）が日常的に使うアプリで、個別の宛先管理が不要

システムのエラー監視は Cloud Logging の構造化ログで行います。

### スケジューリング

- **Google Cloud Scheduler**: 毎日 05:00 JST にチケット収集、毎月 1 日 20:00 JST
  にチケット一覧の送信
- **Google Cloud Tasks**: チケットごとの通知（販売開始前日 20:00、1 時間前、15 分前）
- **pg_cron**: アプリケーションの起動には使わず、DB
  内の古いレコード削除にのみ使う（[データベース自動クリーンアップ](database-cleanup.md)）
- **Cloud Tasks を選んだ理由**:
  - 通知時刻にタスクを実行するイベント駆動で、ポーリングが不要
  - 組み込みの指数バックオフによるリトライ
  - OIDC トークンで Cloud Run を認証付きで呼び出せる

### アーキテクチャパターン

- **設定駆動設計**: 通知タイミングを `NOTIFICATION_TIMING_CONFIG` に集約
- **リポジトリパターン**: データアクセスをリポジトリに分離
- コードの層構成は簡素化に向けて移行中です（#204）。移行後の方針は #215
  で設計ドキュメントに記載します

## 技術比較

### スクレイピング・通知送信の実行環境

| 側面                    | Supabase Edge Functions | Google Cloud Run（採用） |
| ----------------------- | ----------------------- | ------------------------ |
| **メモリ制限**          | 512MB                   | 2GB                      |
| **実行時間**            | 60 秒                   | 300 秒                   |
| **コンテナサポート**    | Deno ランタイムのみ     | 完全な Docker コンテナ   |
| **Playwright サポート** | 制限あり                | 完全サポート             |
| **コールドスタート**    | ~100ms                  | ~1-2 秒                  |
| **コスト**              | 無料枠あり              | 無料枠あり               |

**決定**: Playwright に必要なメモリ・実行時間を確保できる Cloud Run
を採用。通知送信も同じサービスに置き、実行環境を 1 つにまとめた。

### アプリケーション起動のスケジューリング

| 側面                   | pg_cron          | Cloud Scheduler + Tasks（採用） |
| ---------------------- | ---------------- | ------------------------------- |
| **信頼性**             | データベース依存 | 独立したマネージドサービス      |
| **リトライ**           | 手動実装         | 組み込みの指数バックオフ        |
| **呼び出し先の認証**   | 自前で実装       | OIDC トークン                   |
| **時刻指定の個別実行** | ポーリングが必要 | タスクごとに実行時刻を指定      |
| **コスト**             | 無料             | 無料枠内                        |
| **監視**               | PostgreSQL ログ  | Cloud Console + Cloud Logging   |

**決定**: アプリケーションの起動は Cloud Scheduler + Cloud Tasks。pg_cron は DB
内で完結するレコード削除にのみ使う。

## 技術依存関係

### ランタイム依存関係

依存関係は `deno.json` の `imports` で管理します。

| パッケージ                  | 指定                                            | 用途                       |
| --------------------------- | ----------------------------------------------- | -------------------------- |
| `@supabase/supabase-js`     | `npm:@supabase/supabase-js@2`                   | DB アクセス                |
| `playwright`                | `npm:playwright@1.40.0`                         | スクレイピング             |
| `@google-cloud/tasks`       | `npm:@google-cloud/tasks@6.2.0`                 | Cloud Tasks へのタスク登録 |
| `date-fns` / `@date-fns/tz` | `npm:date-fns@4.1.0` / `npm:@date-fns/tz@1.4.1` | 日時計算・JST 変換         |
| `fast-deep-equal`           | `npm:fast-deep-equal@3.1.3`                     | チケットの差分検出         |
| `@std/dotenv`               | `jsr:@std/dotenv@^0.225.0`                      | ローカルの `.env` 読み込み |
| `std/`                      | `https://deno.land/std@0.208.0/`                | テストのアサーションなど   |

LINE Messaging API は SDK を使わず `fetch` で呼び出します。

### 外部サービス

- **Jリーグチケットサイト**、**サンフレッチェ広島公式サイト**: チケット情報の取得元
- **LINE Messaging API**: ユーザー通知
- **Google Cloud APIs**: Cloud Tasks（アプリケーションから）、Cloud Run・Cloud Scheduler（CI/CD
  から）

## パフォーマンス特性

| メトリック               | 目標                   | 実装戦略                                 |
| ------------------------ | ---------------------- | ---------------------------------------- |
| **スクレイピング成功率** | ~98%                   | Cloud Run の十分なリソース               |
| **通知の遅延**           | 指定時刻から 30 秒以内 | Cloud Tasks の時刻指定実行               |
| **エラー復旧**           | 自動リトライ           | Cloud Scheduler / Cloud Tasks のリトライ |
| **コスト**               | 全て無料枠内           | 最小インスタンス 0、同時実行 1           |

### 規模

- **想定負荷**: 月 10〜20 チケット、月 30〜60 通知
- **ボトルネック**: 取得元サイトへのアクセス頻度、LINE の無料メッセージ数

## セキュリティ考慮事項

### 認証

| 経路                          | 認証方式                                              |
| ----------------------------- | ----------------------------------------------------- |
| Cloud Scheduler → Cloud Run   | OIDC トークン（`GC_SA_SCHEDULER`）                    |
| Cloud Tasks → Cloud Run       | OIDC トークン（`CLOUD_TASKS_SERVICE_ACCOUNT`）        |
| Cloud Run → Supabase          | サービスロールキー（Secret Manager から注入）         |
| Cloud Run → LINE API          | チャンネルアクセストークン（Secret Manager から注入） |
| GitHub Actions → Google Cloud | Workload Identity Federation                          |

Cloud Run は `--no-allow-unauthenticated` でデプロイし、`roles/run.invoker`
を持つサービスアカウントだけが呼び出せます。詳細は [security/](security/) を参照してください。

## コスト分析

### 月間コスト内訳（無料枠）

#### Google Cloud Platform

- **Cloud Run**: 日次収集・月次サマリー・通知送信の実行時間のみ（最小インスタンス 0）= 無料枠内
- **Cloud Scheduler**: 2 ジョブ = 無料枠内（3 ジョブまで無料）
- **Cloud Tasks**: 月数十タスク = 無料枠内（月 100 万オペレーション）
- **Cloud Logging**: <1GB = 無料枠内
- **Artifact Registry**: 最新 2 イメージのみ保持（`deploy.yml` で古いイメージを削除）

#### Supabase

- **データベースストレージ**: <500MB（pg_cron で古いレコードを削除）
- **API リクエスト**: 無料枠内

#### 外部サービス

- **LINE Messaging API**: 無料メッセージ数の範囲内（ブロードキャストはフォロワー数 × 通数で数える）

**月間総コスト**: 0 円（全て無料枠内）

## 代替技術評価

### 検討した代替案

#### AWS Lambda + DynamoDB

- **長所**: 成熟したエコシステム、豊富な統合
- **短所**: Playwright のデプロイが煩雑、価格体系が複雑
- **決定**: シンプルさのため GCP + Supabase を選択

#### Azure Functions + Cosmos DB

- **長所**: エンタープライズ統合
- **短所**: 無料枠が小さい、複雑性
- **決定**: このプロジェクトの要件に合わない

#### セルフホスト

- **長所**: 完全な制御、ベンダー依存なし
- **短所**: 運用負荷、信頼性の懸念
- **決定**: マネージドサービスを優先

### 技術選定基準

1. **無料枠**: 無料枠内で運用できること
2. **信頼性**: 99% 以上の稼働
3. **開発者体験**: TypeScript サポート、充実したドキュメント
4. **拡張性**: 取得元サイトや通知タイミングの追加に構成変更なしで対応できる
5. **保守負荷**: 運用作業が最小限
6. **コミュニティ**: 活発なコミュニティと定期的な更新
