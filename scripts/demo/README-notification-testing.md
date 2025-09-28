# 通知機能テストガイド

このガイドでは、ローカル環境での通知機能テストの実行方法について説明します。

## 📁 ファイル構成

```
scripts/
├── data/
│   └── setup-test-ticket.ts           # テストデータ作成・削除（拡張版）
├── demo/
│   ├── test-local-notification-endpoint.ts  # スケジュール通知テスト（改良版）
│   ├── test-ticket-summary.ts         # サマリー通知テスト（既存）
│   └── run-notification-tests.ts      # 統合テストワークフロー（新規）
├── debug/
│   ├── check-tickets-db.ts            # データベース確認
│   └── check-cron-jobs.ts             # スケジュール確認
└── README-notification-testing.md     # このファイル
```

## 🚀 クイックスタート

### 1. 環境準備

```bash
# 環境変数ファイルの設定（必要に応じて）
cp .env.example .env
# .env ファイルを編集して必要な環境変数を設定

# サーバー起動
deno task start
```

### 2. 統合テスト実行（推奨）

```bash
# 完全テスト（データ作成 → テスト実行 → クリーンアップ）
deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts full

# クイックテスト（既存データでテスト実行のみ）
deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts quick
```

### 3. 個別テスト実行

```bash
# 1. テストデータ作成
deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create-notification-test

# 2. サマリー通知テスト
deno run --allow-env --allow-net --allow-read scripts/demo/test-ticket-summary.ts

# 3. スケジュール通知テスト（チケットIDを指定）
deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts <ticket-id>

# 4. テストデータ削除
deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup-all
```

## 📋 詳細な使用方法

### 1. setup-test-ticket.ts（拡張版）

**新機能追加:**

- `create-notification-test`: 通知テスト用の複数チケット作成
- `cleanup-all`: 全テストデータの一括削除

```bash
# 単一テストチケット作成
deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create

# 通知テスト用データ作成（推奨）
deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create-notification-test

# 特定チケット削除
deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup <ticket-id>

# 全テストデータ削除
deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts cleanup-all
```

**作成されるテストデータ:**

- 【通知テスト】浦和レッズ vs FC東京（スケジュール通知用）
- 【サマリーテスト】浦和レッズ vs 横浜F・マリノス（サマリー通知用）
- 【サマリーテスト】浦和レッズ vs セレッソ大阪（サマリー通知用）

### 2. test-local-notification-endpoint.ts（改良版）

**改良点:**

- 通知タイプ指定対応
- 詳細なエラー表示
- 結果サマリー表示

```bash
# 全ての通知タイプをテスト
deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts <ticket-id>

# 特定の通知タイプをテスト
deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts <ticket-id> day_before
deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts <ticket-id> hour_before
deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts <ticket-id> minutes_before
```

### 3. test-ticket-summary.ts（既存）

サマリー通知APIのテスト。既存機能を活用。

```bash
# ローカルサーバーをテスト
deno run --allow-env --allow-net --allow-read scripts/demo/test-ticket-summary.ts

# 特定のURLをテスト
deno run --allow-env --allow-net --allow-read scripts/demo/test-ticket-summary.ts https://your-server-url
```

### 4. run-notification-tests.ts（新規統合ワークフロー）

```bash
# 完全テスト（推奨）
deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts full

# クイックテスト
deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts quick

# クリーンアップのみ
deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts cleanup-only
```

## 🔧 環境変数

```bash
# 必須
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LINE_CHANNEL_ACCESS_TOKEN=your-line-access-token

# オプション
TEST_BASE_URL=http://localhost:8080    # テスト対象のベースURL
KEEP_TEST_DATA=true                    # テストデータを保持（fullモードのみ）
```

## 📊 テスト結果の確認

### 1. LINE アプリでの確認

- LINE Bot から通知が届いているか確認
- 通知内容が正しく表示されているか確認

### 2. ログでの確認

```bash
# サーバーコンソール出力を確認
# 詳細なリクエスト・レスポンス情報が表示されます
```

### 3. データベースでの確認

```bash
# チケットデータ確認
deno run --allow-env --allow-net --allow-read scripts/debug/check-tickets-db.ts
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. サーバー接続エラー

```
❌ ヘルスチェックエラー: fetch failed
```

**解決方法:**

- サーバーが起動しているか確認: `deno task start`
- ポート番号が正しいか確認（デフォルト: 8080）

#### 2. 環境変数エラー

```
❌ SUPABASE_URL が設定されていません
```

**解決方法:**

- `.env` ファイルが存在するか確認
- 必要な環境変数が設定されているか確認

#### 3. チケットIDエラー

```
❌ チケットIDが必要です
```

**解決方法:**

- テストデータを作成: `scripts/data/setup-test-ticket.ts create-notification-test`
- 作成されたチケットIDをコピーして使用

## 🎯 使用シナリオ

### シナリオ1: 初回テスト実行

```bash
# 1. 完全テストで一括実行
deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts full
```

### シナリオ2: 開発中の継続テスト

```bash
# 1. テストデータ作成（初回のみ）
deno run --allow-env --allow-net --allow-read scripts/data/setup-test-ticket.ts create-notification-test

# 2. クイックテスト実行
deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts quick

# 3. 特定機能のテスト
deno run --allow-env --allow-net --allow-read scripts/demo/test-local-notification-endpoint.ts <ticket-id> day_before
```

### シナリオ3: 本番環境テスト

```bash
# 環境変数で本番URLを指定してクイックテスト
TEST_BASE_URL=https://your-production-url deno run --allow-env --allow-net --allow-read --allow-run scripts/demo/run-notification-tests.ts quick
```

## 📝 既存スクリプトとの統合

- **data/setup-test-ticket.ts**: 既存スクリプトを拡張し、通知テスト用データ作成機能を追加
- **demo/test-local-notification-endpoint.ts**: 既存スクリプトを改良し、より詳細なテスト機能を追加
- **demo/test-ticket-summary.ts**: 既存スクリプトをそのまま活用
- **demo/run-notification-tests.ts**: 新規追加の統合ワークフロー

## 💡 Tips

- **初回実行**: `full` モードで完全テストを実行
- **開発中**: `quick` モードで高速テスト
- **デバッグ**: 個別スクリプトで特定機能をテスト
- **本番確認**: `TEST_BASE_URL` 環境変数で本番環境をテスト
- **データ保持**: `KEEP_TEST_DATA=true` でテストデータを保持

---

## 🔗 関連ドキュメント

- **スクレイピングテスト**: `scripts/demo/test-scraping.ts`
- **チケット収集テスト**: `scripts/demo/test-collect-tickets.ts`
- **LINE配信テスト**: `scripts/demo/test-line-broadcast.ts`
- **データベース確認**: `scripts/debug/check-tickets-db.ts`
