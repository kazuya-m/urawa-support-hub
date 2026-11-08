# GCP サービスアカウント最小権限設定

urawa-support-hub が使う GCP サービスアカウントと、それぞれに必要な最小権限です。権限は
`.github/workflows/*.yml` とアプリケーションコードが行う操作から導いています。

## サービスアカウント一覧

| 用途                     | 参照箇所                                           | 主な操作                                                        |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------- |
| CI/CD                    | GitHub Secret `GC_SA_CICD`                         | イメージの push・削除、Cloud Run デプロイ、Scheduler ジョブ更新 |
| Cloud Run サービス       | GitHub Secret `GC_SA_CLOUD_RUN`                    | Cloud Tasks へのタスク登録、Secret Manager の読み取り           |
| Cloud Scheduler          | GitHub Secret `GC_SA_SCHEDULER`                    | Cloud Run の呼び出し（OIDC）                                    |
| Cloud Tasks の呼び出し元 | Cloud Run の環境変数 `CLOUD_TASKS_SERVICE_ACCOUNT` | `/api/send-notification` の呼び出し（OIDC）                     |

Cloud Tasks の呼び出し元には、Cloud Run
サービスのサービスアカウントを兼用してもかまいません。その場合は下記の両方の権限を付与します。

## 必要な権限

### 1. CI/CD（`GC_SA_CICD`）

GitHub Actions から Workload Identity Federation で利用します。

| 操作                                  | ロール                                                       | スコープ                               |
| ------------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| イメージの push と古いイメージの削除  | `roles/artifactregistry.repoAdmin`（push のみなら `writer`） | リポジトリ `urawa-support-hub`         |
| Cloud Run へのデプロイ                | `roles/run.developer`                                        | サービス `urawa-support-hub`           |
| デプロイ時に Cloud Run の SA を指定   | `roles/iam.serviceAccountUser`                               | `GC_SA_CLOUD_RUN`                      |
| Scheduler ジョブの作成・更新          | `roles/cloudscheduler.admin`                                 | プロジェクト                           |
| Scheduler ジョブに OIDC 用 SA を指定  | `roles/iam.serviceAccountUser`                               | `GC_SA_SCHEDULER`                      |
| Workload Identity Federation での借用 | `roles/iam.workloadIdentityUser`                             | GitHub リポジトリの principal に対して |

### 2. Cloud Run サービス（`GC_SA_CLOUD_RUN`）

| 操作                                                                          | ロール                               | スコープ                                           |
| ----------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| 通知タスクの登録                                                              | `roles/cloudtasks.enqueuer`          | キュー `notifications`                             |
| OIDC トークン付きタスクの登録（`CLOUD_TASKS_SERVICE_ACCOUNT` として振る舞う） | `roles/iam.serviceAccountUser`       | `CLOUD_TASKS_SERVICE_ACCOUNT` のサービスアカウント |
| `SUPABASE_SERVICE_ROLE_KEY`・`LINE_CHANNEL_ACCESS_TOKEN` の読み取り           | `roles/secretmanager.secretAccessor` | 該当する 2 つのシークレット                        |

**不要**:

- `roles/run.invoker`: Cloud Run サービス自身は他のサービスを呼び出さない（呼び出すのは Cloud
  Tasks）
- `storage.*`: データは Supabase PostgreSQL に保存し、Cloud Storage は使わない

### 3. Cloud Scheduler（`GC_SA_SCHEDULER`）

| 操作                         | ロール              | スコープ                     |
| ---------------------------- | ------------------- | ---------------------------- |
| Cloud Run の呼び出し（OIDC） | `roles/run.invoker` | サービス `urawa-support-hub` |

### 4. Cloud Tasks の呼び出し元（`CLOUD_TASKS_SERVICE_ACCOUNT`）

| 操作                                        | ロール              | スコープ                     |
| ------------------------------------------- | ------------------- | ---------------------------- |
| `/api/send-notification` の呼び出し（OIDC） | `roles/run.invoker` | サービス `urawa-support-hub` |

Cloud Run は `--no-allow-unauthenticated` でデプロイされるため、`roles/run.invoker`
のない呼び出しは拒否されます。

## 設定コマンド

`PROJECT_ID`・`REGION` は環境に合わせて置き換えます。

```bash
# サービスアカウントの作成
gcloud iam service-accounts create cloud-run-service --display-name="Cloud Run service"
gcloud iam service-accounts create cloud-scheduler-sa --display-name="Cloud Scheduler"

CLOUD_RUN_SA=cloud-run-service@PROJECT_ID.iam.gserviceaccount.com
SCHEDULER_SA=cloud-scheduler-sa@PROJECT_ID.iam.gserviceaccount.com

# Cloud Run サービス: Cloud Tasks への登録
gcloud tasks queues add-iam-policy-binding notifications \
  --location=REGION \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/cloudtasks.enqueuer"

# Cloud Run サービス: Secret Manager の読み取り
for secret in SUPABASE_SERVICE_ROLE_KEY LINE_CHANNEL_ACCESS_TOKEN; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor"
done

# Cloud Run サービスを CLOUD_TASKS_SERVICE_ACCOUNT として兼用する場合
gcloud iam service-accounts add-iam-policy-binding "${CLOUD_RUN_SA}" \
  --member="serviceAccount:${CLOUD_RUN_SA}" \
  --role="roles/iam.serviceAccountUser"

# Cloud Run の呼び出し権限（Scheduler と Cloud Tasks の呼び出し元）
for sa in "${SCHEDULER_SA}" "${CLOUD_RUN_SA}"; do
  gcloud run services add-iam-policy-binding urawa-support-hub \
    --region=REGION \
    --member="serviceAccount:${sa}" \
    --role="roles/run.invoker"
done
```

## セキュリティベストプラクティス

### 1. 最小権限の原則

- 各サービスアカウントには上記の権限のみを付与する
- `roles/run.invoker` はプロジェクト全体ではなくサービス `urawa-support-hub` に付与する
- `roles/editor` や `roles/owner` などの広い権限を付与しない

### 2. キーを発行しない

- GitHub Actions は Workload Identity Federation、Cloud Run
  はアタッチしたサービスアカウントで認証するため、サービスアカウントキー（JSON）は発行しない
- 組織ポリシーでキー作成を禁止できる場合は禁止する

### 3. 監視と見直し

- Cloud Audit Logs でサービスアカウントの使用状況を確認する
- IAM Recommender が提示する未使用権限を定期的に削除する
- 権限を変更したらこのドキュメントを更新する
