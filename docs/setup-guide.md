# 環境セットアップガイド

urawa-support-hub（Google Cloud Run + Supabase）のローカル開発環境と本番環境のセットアップ手順です。

## 前提ツール

| ツール           | 用途                                              | 備考                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deno             | ランタイム                                        | CI と Dockerfile は 2.4.5 に固定                                                                                                                                                             |
| Docker / Compose | ローカル開発環境（アプリ + Cloud Tasks Emulator） | `deno task dev` で使用                                                                                                                                                                       |
| Supabase CLI     | ローカル DB、マイグレーション                     | CI は 2.122.0 に固定。インストール方法は [Supabase CLI のドキュメント](https://supabase.com/docs/guides/local-development/cli/getting-started) を参照（`npm install -g` には対応していない） |
| Google Cloud CLI | 本番環境の初期設定・確認                          | ローカル開発だけなら不要                                                                                                                                                                     |

```bash
deno --version
supabase --version
gcloud --version
```

## ローカル開発

### 1. ローカル Supabase の起動

`supabase/config.toml` はリポジトリに含まれているため、`supabase init` は不要です。

```bash
deno task db:start   # supabase start
supabase status      # URL とキーを確認
```

| サービス | ポート |
| -------- | ------ |
| API      | 54321  |
| DB       | 54322  |
| Studio   | 54323  |

`supabase start` 時に `supabase/migrations/` のマイグレーションが適用されます。DB を作り直すときは
`deno task db:reset` を使います。

### 2. 環境変数ファイル

| ファイル     | 読み込む側                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `.env`       | アプリ起動時に `src/config/di.ts` が `@std/dotenv` で読み込む（`deno task dev:local`）。`scripts/` 配下のスクリプトも同様 |
| `.env.local` | `docker-compose.yml` の `env_file`（`deno task dev`）                                                                     |

どちらも `.gitignore` で除外されています。テンプレートは `.env.example` です。

```bash
cp .env.example .env
cp .env.example .env.local
```

`docker-compose.yml` は `SUPABASE_URL=http://host.docker.internal:54321` と
`CLOUD_TASKS_EMULATOR_HOST=cloud-tasks-emulator:8123` を上書きするため、`.env.local` でこの 2
つを設定する必要はありません。

アプリが読む環境変数:

| 変数                          | 必須 | 用途                                                                                  |
| ----------------------------- | ---- | ------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                | ✅   | Supabase の URL                                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`   | ✅   | Supabase のサービスロールキー（アプリは管理者クライアントで接続する）                 |
| `SUPABASE_ANON_KEY`           |      | テスト用クライアントで使用                                                            |
| `LINE_CHANNEL_ACCESS_TOKEN`   | ✅   | LINE Messaging API のチャンネルアクセストークン                                       |
| `GC_PROJECT_ID`               | ✅   | Cloud Tasks のプロジェクト ID                                                         |
| `CLOUD_TASKS_LOCATION`        |      | Cloud Tasks のロケーション。未設定時は `GCP_REGION`、それもなければ `asia-northeast1` |
| `CLOUD_TASKS_SERVICE_ACCOUNT` | ✅   | Cloud Tasks が通知エンドポイントを呼ぶときの OIDC トークン用サービスアカウント        |
| `CLOUD_RUN_NOTIFICATION_URL`  | ✅   | 通知送信エンドポイントの完全な URL（`https://<Cloud Run URL>/api/send-notification`） |
| `CLOUD_TASKS_EMULATOR_HOST`   |      | 設定すると Cloud Tasks Emulator に接続する（`NODE_ENV=production` のときは無視）      |
| `CLOUD_TASKS_DEBUG`           |      | `true` で Cloud Tasks のデバッグログを出力                                            |
| `NODE_ENV`                    |      | `production` で本番動作。本番は `Dockerfile` で設定済み                               |
| `PORT`                        |      | 待ち受けポート（既定 8080）                                                           |

キュー名は `notifications` でコードに固定されています（`src/config/app-config.ts`）。

### 3. アプリケーションの起動

```bash
# Docker Compose（アプリ + Cloud Tasks Emulator、--watch 付き）
deno task dev
deno task dev:logs
deno task dev:down

# Docker を使わずに直接起動（Playwright を動かすための権限付き）
deno task dev:local
```

| サービス             | ポート |
| -------------------- | ------ |
| アプリケーション     | 8080   |
| Cloud Tasks Emulator | 8123   |

### 4. 動作確認

```bash
# ヘルスチェック（SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY の有無を確認）
curl http://localhost:8080/health

# 通知送信エンドポイント
curl -X POST 'http://localhost:8080/api/send-notification' \
  -H 'Content-Type: application/json' \
  -d '{"ticketId": "test-123", "notificationType": "day_before"}'
```

エンドポイント:

| メソッド | パス                     | 呼び出し元              |
| -------- | ------------------------ | ----------------------- |
| POST     | `/api/collect-tickets`   | Cloud Scheduler（毎日） |
| POST     | `/api/ticket-summary`    | Cloud Scheduler（毎月） |
| POST     | `/api/send-notification` | Cloud Tasks             |
| GET      | `/health`                | ヘルスチェック          |

動作確認用のスクリプトは `deno.json` の `demo:*`・`debug:*` タスクにあります。

### 5. テスト

```bash
# 全テスト（統合テストはローカル Supabase が必要）
deno test --allow-env --allow-net=127.0.0.1

# ユニットテストのみ
deno test src/

# 統合テストのみ
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# 型チェック・Lint・フォーマット確認
deno task pre-commit
```

## 本番環境

### 1. GCP リソースの初期作成（初回のみ）

以下は workflow では作成されないため、初回に手動で作成します。`GC_REGION` は GitHub Secrets
と同じ値（例: `asia-northeast1`）を使います。

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# API の有効化
gcloud services enable \
  run.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudtasks.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iamcredentials.googleapis.com

# Artifact Registry リポジトリ（deploy.yml が push する先）
gcloud artifacts repositories create urawa-support-hub \
  --repository-format=docker \
  --location=GC_REGION

# Cloud Tasks キュー（名前はコードに固定）
gcloud tasks queues create notifications --location=GC_REGION

# Secret Manager（deploy.yml の --update-secrets が参照する名前）
printf '%s' 'SERVICE_ROLE_KEY' | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
printf '%s' 'LINE_TOKEN' | gcloud secrets create LINE_CHANNEL_ACCESS_TOKEN --data-file=-
```

サービスアカウントと必要な権限は
[GCP サービスアカウント権限](security/gcp-service-account-permissions.md)、GitHub Actions
からの認証（Workload Identity Federation）と GitHub Secrets は
[GitHub Secrets設定](github-secrets-setup.md) を参照してください。

### 2. Cloud Run

`main` への push で `.github/workflows/deploy.yml` が実行され、イメージを Artifact Registry に push
してサービス `urawa-support-hub` をデプロイします。手動実行は Actions の「Deploy to Cloud
Run」から行います。

デプロイ設定（`deploy.yml`）:

| 項目               | 値                                                                      |
| ------------------ | ----------------------------------------------------------------------- |
| メモリ             | 2Gi                                                                     |
| タイムアウト       | 300 秒                                                                  |
| インスタンス数     | 0〜1                                                                    |
| 同時実行数         | 1                                                                       |
| 認証               | `--no-allow-unauthenticated`（呼び出しには `roles/run.invoker` が必要） |
| サービスアカウント | `GC_SA_CLOUD_RUN`                                                       |
| Secret Manager     | `SUPABASE_SERVICE_ROLE_KEY`、`LINE_CHANNEL_ACCESS_TOKEN`                |

`deploy.yml`
はシークレット以外の環境変数を設定しません。初回デプロイ後に、サービスへ直接設定します（以降のデプロイでも保持されます）。

```bash
gcloud run services update urawa-support-hub \
  --region=GC_REGION \
  --update-env-vars="SUPABASE_URL=https://xxxxx.supabase.co,GC_PROJECT_ID=YOUR_PROJECT_ID,CLOUD_TASKS_SERVICE_ACCOUNT=SA_EMAIL,CLOUD_RUN_NOTIFICATION_URL=https://<Cloud Run URL>/api/send-notification"
```

`NODE_ENV=production` と `PORT=8080` は `Dockerfile` で設定されています。

### 3. データベース

`main` への push で `supabase/migrations/**`
に変更があると、`.github/workflows/migrate-database.yml` がマイグレーションを適用します。手動実行は
Actions の「Migrate Supabase Database」から行い、`dry_run`（適用状況の確認のみ）と `include_seed`
を指定できます。

ローカルから適用する場合:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 4. Cloud Scheduler

ジョブの設定は `infrastructure/scheduler/config.yaml` にあり、`main` への push で
`infrastructure/scheduler/**` か `.github/workflows/deploy-scheduler.yml`
に変更があると、`deploy-scheduler.yml` がジョブを作成・更新します。

| ジョブ                    | スケジュール（Asia/Tokyo）      | エンドポイント         | 期限   |
| ------------------------- | ------------------------------- | ---------------------- | ------ |
| `daily-ticket-collection` | `0 5 * * *`（毎日 05:00）       | `/api/collect-tickets` | 300 秒 |
| `monthly-ticket-summary`  | `0 20 1 * *`（毎月 1 日 20:00） | `/api/ticket-summary`  | 120 秒 |

どちらも POST、リトライ 3 回、`GC_SA_SCHEDULER` の OIDC トークンで Cloud Run を呼び出します。

#### 事前準備

- スケジューラー用サービスアカウントを作成し、Cloud Run サービスに `roles/run.invoker`
  を付与する（[GCP サービスアカウント権限](security/gcp-service-account-permissions.md)）
- GitHub Secrets に `GC_SA_SCHEDULER` と `CLOUD_RUN_URL` を登録する

#### 手動でジョブを作成する場合

```bash
gcloud scheduler jobs create http daily-ticket-collection \
  --location=GC_REGION \
  --schedule="0 5 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="${CLOUD_RUN_URL}/api/collect-tickets" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"source":"cloud-scheduler"}' \
  --attempt-deadline="300s" \
  --max-retry-attempts=3 \
  --min-backoff=30s \
  --max-backoff=300s \
  --oidc-service-account-email="${GC_SA_SCHEDULER}" \
  --oidc-token-audience="${CLOUD_RUN_URL}"
```

#### 確認

```bash
gcloud scheduler jobs describe daily-ticket-collection --location=GC_REGION
gcloud scheduler jobs run daily-ticket-collection --location=GC_REGION
gcloud logging read 'resource.type=cloud_scheduler_job' --limit=5
```

## トラブルシューティング

**Supabase に接続できない**

```bash
supabase status
deno task db:restart
```

Docker Compose から接続する場合は、`SUPABASE_URL` が `host.docker.internal:54321`
になっていることを確認します（`docker-compose.yml` で設定済み）。

**通知タスクが作成されない**

- `CLOUD_RUN_NOTIFICATION_URL` が未設定だとチケット収集時にエラーになる
- 本番では `notifications` キューが `CLOUD_TASKS_LOCATION`（または `GCP_REGION`、既定
  `asia-northeast1`）に存在するか確認する
- Cloud Run のサービスアカウントが `CLOUD_TASKS_SERVICE_ACCOUNT`
  として振る舞える（`iam.serviceAccounts.actAs`）か確認する

**Google Cloud の認証**

```bash
gcloud auth list
gcloud auth login
```

## 関連ドキュメント

- [GitHub Secrets設定](github-secrets-setup.md)
- [セキュリティドキュメント](security/)
- [技術選定](tech-selection.md)
- [要件定義](requirements.md)
- [システムアーキテクチャ](system-architecture.md)（コードの移行中（#204）のため、現在のコードと異なる記述を含む）
