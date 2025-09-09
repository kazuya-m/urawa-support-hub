# 環境変数管理ルール

このドキュメントでは、浦和サポートハブプロジェクトの環境変数と機密設定の安全な管理について定義します。

## セキュリティ分類

### 1. 公開設定（コミット可能）

**例**: 機能フラグ、APIエンドポイント、非機密デフォルト値

```bash
# ✅ 安全 - .env.exampleに含めることが可能
PUBLIC_API_BASE_URL="https://api.example.com"
SCRAPING_INTERVAL_HOURS=24
LOG_LEVEL="info"
DEFAULT_TIMEZONE="Asia/Tokyo"
```

### 2. 機密設定（絶対にコミット禁止）

**例**: APIキー、トークン、認証情報、シークレット

```bash
# ❌ 絶対にコミット禁止 - .envのみに保持
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
LINE_CHANNEL_ACCESS_TOKEN="abcd1234..."
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
GOOGLE_CLOUD_CREDENTIALS="base64-encoded-json"
```

### 3. 環境固有設定

**例**: データベースURL、環境によって変わるサービスエンドポイント

```bash
# 開発環境
SUPABASE_URL="https://dev-project.supabase.co"
GOOGLE_CLOUD_PROJECT_ID="urawa-support-dev"

# 本番環境
SUPABASE_URL="https://prod-project.supabase.co"
GOOGLE_CLOUD_PROJECT_ID="urawa-support-prod"
```

## ファイル構成

### 1. ファイル構造

```
├── .env.example          # ダミー値を含む公開テンプレート
├── .env                  # ローカル開発用（絶対にコミット禁止）
├── .env.local           # 個人用上書き（絶対にコミット禁止）
├── .env.development     # 開発環境用（絶対にコミット禁止）
├── .env.staging         # ステージング環境用（絶対にコミット禁止）
├── .env.production      # 本番環境用（絶対にコミット禁止）
└── .gitignore           # 全ての機密.envファイルを除外
```

### 2. .env.exampleテンプレート

```bash
# Supabase設定
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="eyJ_your_anon_key_here"
SUPABASE_SERVICE_ROLE_KEY="eyJ_your_service_role_key_here"

# Google Cloud設定
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_REGION="asia-northeast1"
GOOGLE_CLOUD_CREDENTIALS="base64-encoded-service-account-json"

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN="your_line_channel_access_token"
LINE_CHANNEL_SECRET="your_line_channel_secret"

# Discord Webhook
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/your/webhook/url"

# アプリケーション設定
LOG_LEVEL="info"
SCRAPING_INTERVAL_HOURS="24"
DEFAULT_TIMEZONE="Asia/Tokyo"
NODE_ENV="development"

# オプション: 開発用上書き設定
# DATABASE_LOG_LEVEL="debug"
# SCRAPING_TEST_MODE="true"
```

### 3. 環境変数読み込み優先順位

1. `.env.local`（最高優先度 - 個人用上書き）
2. `.env.${NODE_ENV}`（環境固有）
3. `.env`（開発用デフォルト）
4. `.env.example`（読み込まれない - テンプレートのみ）

## 安全な保存方法

### 1. ローカル開発

**方法**: 適切な.gitignoreを設定した`.env`ファイル

```bash
# .envファイルに保存
echo "SUPABASE_SERVICE_ROLE_KEY=eyJ..." >> .env

# .gitignoreで除外されていることを確認
grep -n "\.env" .gitignore
```

### 2. Cloud Run環境変数

**方法**: gcloudコマンドまたはCloud Consoleで設定

```bash
# Cloud Run用環境変数設定
gcloud run services update urawa-support-hub \
  --set-env-vars="SUPABASE_URL=https://...,SUPABASE_SERVICE_ROLE_KEY=eyJ..." \
  --region=asia-northeast1
```

### 3. Supabase Edge Functions

**方法**: Supabaseシークレット管理

```bash
# Edge Functions用シークレット設定
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN="your_token"
supabase secrets set DISCORD_WEBHOOK_URL="your_webhook"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_key"
```

### 4. Google Secret Manager（本番環境推奨）

**方法**: Google Secret Managerに機密値を保存

```bash
# Secret Managerにシークレット保存
gcloud secrets create line-channel-token --data-file=token.txt

# 実際にシークレットが必要なサービスのみにアクセス権限付与
# ❌ スクレイパーには付与しない - Cloud Run環境変数経由で十分
# ✅ 動的にシークレットをフェッチするサービスのみに付与

# 例: スケジューラーが動的にシークレットをフェッチする必要がある場合
# gcloud secrets add-iam-policy-binding line-channel-token \
#   --member="serviceAccount:urawa-scheduler@project.iam.gserviceaccount.com" \
#   --role="roles/secretmanager.secretAccessor"

# ⚠️ 原則: 環境変数で不十分な場合のみSecret Managerアクセス権限を付与

# Cloud Runからアクセス
export LINE_CHANNEL_ACCESS_TOKEN=$(gcloud secrets versions access latest --secret="line-channel-token")
```

## 検証とテスト

### 1. 環境変数検証機能

```typescript
// src/shared/utils/validateEnvironment.ts
export function validateEnvironment(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'DISCORD_WEBHOOK_URL',
    'GOOGLE_CLOUD_PROJECT_ID',
  ];

  const missing = required.filter((key) => !Deno.env.get(key));

  if (missing.length > 0) {
    // ❌ セキュリティ: システム構造を暘露する可能性のある実際の変数名をログ出力しない
    throw new Error(
      `${missing.length}個の必須環境変数が不足しています。.env.exampleを確認してください。`,
    );
  }

  // ✅ セキュリティ: 変数名を暈露せず成功のみログ出力
  console.log('✅ 必要な環境変数がすべて存在しています。');
}

// アプリケーション起動時に検証
validateEnvironment();
```

### 2. 開発環境セットアップ検証

```bash
# 環境設定チェック
deno run --allow-env scripts/check-environment.ts

# Supabase接続テスト
deno run --allow-env --allow-net scripts/test-supabase.ts

# 外部サービステスト
deno run --allow-env --allow-net scripts/test-external-services.ts
```

## セキュリティベストプラクティス

### 1. ローテーションスケジュール

- **LINEトークン**: 90日ごとにローテーション
- **Discord Webhook**: 90日ごとに再生成
- **Supabaseキー**: 90日ごとにローテーション
- **GCPサービスアカウント**: 90日ごとにローテーション
- **データベースパスワード**: 30日ごとにローテーション（該当する場合）

### 2. アクセスログ

```bash
# 環境変数アクセス監視
export AUDIT_ENV_ACCESS=true

# 機密変数アクセス時のログ出力
function auditEnvAccess() {
  echo "$(date): 環境変数にアクセスされました: $1" >> .env-access.log
}
```

### 3. 開発チームガイドライン

- **実値を含む`.env`ファイルを絶対にコミットしない**
- **チャット/メールで環境変数を絶対に共有しない**
- **オンボーディングには必ず`.env.example`を使用**
- **開発キーを定期的にローテーション**
- **キーの漏洩を即座に報告**

### 4. CI/CDセキュリティ

```yaml
# GitHub Actionsの例
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
```

## トラブルシューティング

### 1. よくある問題

**環境変数の不足**:

```bash
# 変数が設定されているかチェック
echo $SUPABASE_URL

# 全環境変数を一覧表示
env | grep SUPABASE

# 環境ファイル再読み込み
source .env
```

**権限拒否エラー**:

```bash
# ファイル権限チェック
ls -la .env

# 権限修正（所有者のみ読み取り可能）
chmod 600 .env
```

### 2. 緊急時対応手順

**キーの漏洩**:

1. 影響を受けたキーを即座にローテーション
2. 全環境を新しいキーで更新
3. 不正使用についてアクセスログをレビュー
4. ダミー値が漏洩した場合は.env.exampleを更新

**環境変数によるサービス障害**:

1. Cloud Run環境変数をチェック
2. Supabaseシークレットが設定されていることを確認
3. 新しいキーで接続をテスト
4. 認証失敗についてエラーログを監視

## 実装チェックリスト

### 新環境セットアップ

- [ ] `.env.example`を`.env`にコピー
- [ ] 全変数に実際の値を入力
- [ ] `.env`が`.gitignore`に含まれていることを確認
- [ ] 環境変数検証スクリプトを実行
- [ ] 全外部サービス接続をテスト
- [ ] 新しい変数を`.env.example`に文書化

### 認証情報ローテーション

- [ ] サービスプロバイダーから新しい認証情報を生成
- [ ] ローカル`.env`ファイルを更新
- [ ] Cloud Run環境変数を更新
- [ ] Supabaseシークレットを更新
- [ ] 新しい認証情報で全サービスをテスト
- [ ] 古い認証情報を無効化
- [ ] チームドキュメントを更新
