# GCP サービスアカウント最小権限設定

このドキュメントでは、浦和サポートハブプロジェクトで使用するGCPサービスアカウントの最小必要権限を定義します。

## サービスアカウント戦略

### 1. スクレイピング用サービスアカウント（Cloud Run用）

**目的**: Playwrightスクレイピング処理の実行 **リソース**: Cloud Runサービス実行

**必要な権限**:

```yaml
# Cloud Tasks（通知トリガー用）
- cloudtasks.queues.get
- cloudtasks.tasks.create
- cloudtasks.tasks.get

# 基本的なCloud Runサービス情報（ヘルスチェック用のみ）
- run.services.get（自身のサービスのみ）
```

**❌ 不要**:

- `storage.*` 権限 - データはSupabase PostgreSQLに保存、Cloud Storageは未使用
- `run.services.list` - サービスは自身の情報のみ必要
- `run.executions.*` - 基本的なスクレイピング処理には不要

**推奨IAMロール**:

- `roles/cloudtasks.enqueuer` (通知タスク作成用)
- 最小限のCloud Run権限を持つカスタムロール（以下の実装を参照）

**❌ 不要**: `roles/run.invoker` - スクレイピングサービスは他のサービスを呼び出さない

### 2. 通知用サービスアカウント（Edge Functions用）

**目的**: Supabase Edge Functions経由でLINE/Discord通知送信 **リソース**: Supabase Edge
Function呼び出し

**必要な権限**:

```yaml
# Edge Function実行用基本コンピュート権限
- 特定のGCP権限は不要（Supabaseで管理）
```

**必要な環境変数**:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `DISCORD_WEBHOOK_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. スケジューラー用サービスアカウント（Cloud Scheduler用）

**目的**: 日次スクレイピングジョブのトリガー **リソース**: Cloud Scheduler、Cloud Run呼び出し

**必要な権限**:

```yaml
# Cloud Run呼び出し（特定のスクレイピングサービスのみ）
- run.services.get（特定のサービスのみ）
- run.routes.invoke（特定のサービスのみ）

# Cloud Schedulerの管理
- cloudscheduler.jobs.get
- cloudscheduler.jobs.run
```

**推奨IAMロール**:

- `roles/run.invoker` (⚠️ 特定のスクレイピングサービスのみ、プロジェクト全体ではない)
- `roles/cloudscheduler.jobRunner`

## セキュリティベストプラクティス

### 1. 最小権限の原則

- 各サービスに必要な最小権限のみを付与
- 適切な場合は事前定義されたIAMロールを使用、きめ細かい制御にはカスタムロールを優先
- `roles/editor`や`roles/owner`などの広範囲な権限を避ける
- **サービス固有権限**:
  `roles/run.invoker`は特定のサービスにのみ付与、プロジェクト全体には付与しない
- **カスタムロール**: 事前定義ロールが過剰な権限を付与する場合はカスタムロールを作成

### 2. サービスアカウントのローテーション

- サービスアカウントキーを90日ごとにローテーション
- 可能な限りWorkload Identity Federationを使用
- Cloud Audit Logsでサービスアカウント使用状況を監視

### 3. 環境別アカウント

```bash
# 開発環境
urawa-support-dev-scraper@project-dev.iam.gserviceaccount.com

# 本番環境
urawa-support-prod-scraper@project-prod.iam.gserviceaccount.com
```

### 4. キー管理

- サービスアカウントキーを環境変数として保存
- バージョン管理にキーをコミットしない
- 本番環境のシークレットにはGoogle Secret Managerを使用

## 実装コマンド

### サービスアカウント作成

```bash
# スクレイピング用サービスアカウント
gcloud iam service-accounts create urawa-scraper \
  --display-name="Urawa Support Scraper" \
  --description="Playwrightスクレイピング処理用サービスアカウント"

# スケジューラー用サービスアカウント
gcloud iam service-accounts create urawa-scheduler \
  --display-name="Urawa Support Scheduler" \
  --description="Cloud Scheduler処理用サービスアカウント"
```

### 最小権限の付与

```bash
# 1. スクレイパー用に最小権限のカスタムロールを作成
gcloud iam roles create urawaScrapingServiceRole \
  --project=PROJECT_ID \
  --title="Urawa Scraping Service Role" \
  --description="Cloud Runスクレイピングサービス用最小権限" \
  --permissions="run.services.get,cloudtasks.queues.get,cloudtasks.tasks.create,cloudtasks.tasks.get"

# 2. スクレイパーにカスタムロールを付与（run.invokerは不要）
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:urawa-scraper@PROJECT_ID.iam.gserviceaccount.com" \
  --role="projects/PROJECT_ID/roles/urawaScrapingServiceRole"

# 3. スケジューラーにCloud Scheduler Job Runnerロールを付与
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:urawa-scheduler@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.jobRunner"

# 4. スケジューラーに特定のスクレイピングサービスのみrun.invokerロールを付与
gcloud run services add-iam-policy-binding urawa-support-hub \
  --member="serviceAccount:urawa-scheduler@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --region=asia-northeast1
```

### キー生成とダウンロード

```bash
# スクレイパー用サービスアカウントキー生成
gcloud iam service-accounts keys create scraper-key.json \
  --iam-account=urawa-scraper@PROJECT_ID.iam.gserviceaccount.com

# スケジューラー用サービスアカウントキー生成
gcloud iam service-accounts keys create scheduler-key.json \
  --iam-account=urawa-scheduler@PROJECT_ID.iam.gserviceaccount.com
```

## 監視と監査

### 1. 監査ログの有効化

```bash
# サービスアカウント使用状況の監査ログ有効化
gcloud logging sinks create service-account-audit \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/security_audit \
  --log-filter='protoPayload.serviceName="iam.googleapis.com"'
```

### 2. 定期的な権限レビュー

- 月次でサービスアカウント権限をレビュー
- 未使用権限の即座削除
- 権限変更をこのファイルに文書化

## 環境変数セキュリティ

すべてのサービスアカウントキーと機密設定は環境変数として保存する必要があります：

```bash
# GCPサービスアカウントキー（base64エンコード済みJSON）
GOOGLE_CLOUD_CREDENTIALS_SCRAPER="base64-encoded-key"
GOOGLE_CLOUD_CREDENTIALS_SCHEDULER="base64-encoded-key"

# プロジェクト設定
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_REGION="asia-northeast1"
```
