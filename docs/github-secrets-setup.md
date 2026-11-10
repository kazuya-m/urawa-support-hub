# GitHub Secrets 設定ガイド

GitHub Actions のワークフローが参照するシークレットと、その設定方法です。

## 概要

GitHub Secrets は、CI/CD で必要な機密情報を暗号化して保存します。ワークフロー実行時にのみ参照でき、ログでは `***` にマスクされます。

アプリケーション（Cloud Run）が実行時に使う `SUPABASE_SERVICE_ROLE_KEY` と `LINE_CHANNEL_ACCESS_TOKEN` は、GitHub Secrets ではなく Google Secret Manager から Cloud Run に渡します（[セットアップガイド](setup-guide.md#1-gcp-リソースの初期作成初回のみ)）。

## 必要なシークレット

`.github/workflows/*.yml` が参照するシークレットの一覧です。`deploy.yml` と `migrate-database.yml` は `environment: production` で実行されるため、これらが使うシークレットはリポジトリシークレットか `production` 環境のシークレットとして登録します。

### 1. Supabase

| シークレット名              | 説明                                                        | 使用するワークフロー   | 値の例                   |
| --------------------------- | ----------------------------------------------------------- | ---------------------- | ------------------------ |
| `SUPABASE_URL`              | テストが接続する Supabase の URL                            | `ci.yml`               | `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY`         | テストが使う Supabase 匿名キー                              | `ci.yml`               | `eyJhbGci...`            |
| `SUPABASE_SERVICE_ROLE_KEY` | テストが使う Supabase サービスロールキー                    | `ci.yml`               | `eyJhbGci...`            |
| `SUPABASE_ACCESS_TOKEN`     | Supabase のパーソナルアクセストークン                       | `migrate-database.yml` | `sbp_...`                |
| `SUPABASE_DB_PASSWORD`      | Supabase プロジェクトのデータベースパスワード               | `migrate-database.yml` | -                        |
| `SUPABASE_PROJECT_ID`       | プロジェクト参照 ID（`supabase link --project-ref` に渡す） | `migrate-database.yml` | `abcdefghijklmnop`       |

### 2. Google Cloud Platform（Workload Identity Federation）

値の例のうち大文字の部分（`PROJECT_ID`・`PROJECT_NUMBER`・`POOL_ID`・`PROVIDER_ID`・`*_SA_NAME`・`OWNER/REPO`・`REPOSITORY_ID` など）は、環境ごとの値に置き換えて読んでください。

| シークレット名    | 説明                                    | 使用するワークフロー                 | 値の例                                                                                         |
| ----------------- | --------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `GC_PROJECT_ID`   | GCP プロジェクト ID                     | `deploy.yml`、`deploy-scheduler.yml` | `PROJECT_ID`                                                                                   |
| `GC_REGION`       | GCP リージョン                          | `deploy.yml`、`deploy-scheduler.yml` | `asia-northeast1`                                                                              |
| `WIF_PROVIDER`    | Workload Identity Federation プロバイダ | `deploy.yml`、`deploy-scheduler.yml` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID` |
| `GC_SA_CICD`      | CI/CD 用サービスアカウントのメール      | `deploy.yml`、`deploy-scheduler.yml` | `CICD_SA_NAME@PROJECT_ID.iam.gserviceaccount.com`                                              |
| `GC_SA_CLOUD_RUN` | Cloud Run サービスのサービスアカウント  | `deploy.yml`                         | `RUN_SA_NAME@PROJECT_ID.iam.gserviceaccount.com`                                               |
| `GC_SA_SCHEDULER` | Cloud Scheduler のサービスアカウント    | `deploy-scheduler.yml`               | `SCHEDULER_SA_NAME@PROJECT_ID.iam.gserviceaccount.com`                                         |
| `CLOUD_RUN_URL`   | Cloud Run サービスの URL                | `deploy-scheduler.yml`               | `https://urawa-support-hub-HASH-REGION_CODE.a.run.app`                                         |

## セットアップ手順

### ステップ1: リポジトリ設定へ移動

1. GitHub リポジトリにアクセス
2. **Settings** タブをクリック
3. 左サイドバーで **Secrets and variables** → **Actions** をクリック

### ステップ2: シークレットを追加

各シークレットについて：

1. **New repository secret** をクリック
2. **Name** を入力（上記の表と完全に一致させる）
3. **Value** を入力
4. **Add secret** をクリック

### ステップ3: シークレット値の取得方法

#### Supabase

CI のテストは `--allow-net=127.0.0.1` で実行され、ワークフロー内で `supabase start` したローカル Supabase に接続します。`SUPABASE_URL`・`SUPABASE_ANON_KEY`・`SUPABASE_SERVICE_ROLE_KEY` には、`supabase status` で表示されるローカルの値を登録します。

マイグレーション用の値は本番プロジェクトから取得します。

1. [Supabase ダッシュボード](https://supabase.com/dashboard)にログインし、プロジェクトを選択
2. **Settings** → **General** の Reference ID → `SUPABASE_PROJECT_ID`
3. **Settings** → **Database** のデータベースパスワード → `SUPABASE_DB_PASSWORD`
4. アカウントの **Access Tokens** で発行したトークン → `SUPABASE_ACCESS_TOKEN`

#### Google Cloud Platform

1. **プロジェクト情報**: プロジェクト ID → `GC_PROJECT_ID`、リージョン → `GC_REGION`（例: `asia-northeast1`）

2. **Workload Identity プロバイダー**:
   ```bash
   gcloud iam workload-identity-pools list --location=global

   # POOL_ID は上のコマンドで表示されたプールの ID。PROVIDER_ID は次のコマンドの出力（WIF_PROVIDER の末尾の部分）
   gcloud iam workload-identity-pools providers list \
     --location=global \
     --workload-identity-pool=POOL_ID

   # プロバイダーの完全なリソース名をコピー → WIF_PROVIDER
   ```

   プロバイダーの属性条件（attribute condition）で、このリポジトリの `main` ブランチからのトークンだけを受け付けるよう絞っていることを確認します。条件が空、またはオーナー単位（`assertion.repository_owner`）だけの条件では、他のリポジトリや任意のブランチの GitHub Actions からも `GC_SA_CICD` を借用できる可能性があります。

   ```bash
   gcloud iam workload-identity-pools providers describe PROVIDER_ID \
     --location=global \
     --workload-identity-pool=POOL_ID \
     --format='value(attributeCondition)'

   # 推奨: assertion.repository_id == 'REPOSITORY_ID' && assertion.ref == 'refs/heads/main'
   ```

   `REPOSITORY_ID` は GitHub のリポジトリ ID です。リポジトリ名ではなく ID を使うと、改名や同名での作り直しの影響を受けません。条件を変えるときは次のコマンドを使います。`ref` で `main` に絞るため、`main` 以外のブランチから `deploy.yml`・`deploy-scheduler.yml` を手動実行すると認証に失敗します。

   ```bash
   # REPOSITORY_ID の取得
   gh api repos/OWNER/REPO --jq .id

   gcloud iam workload-identity-pools providers update-oidc PROVIDER_ID \
     --location=global \
     --workload-identity-pool=POOL_ID \
     --attribute-condition="assertion.repository_id == 'REPOSITORY_ID' && assertion.ref == 'refs/heads/main'"
   ```

   借用できるかは、`GC_SA_CICD` 側の `roles/iam.workloadIdentityUser` の付与先でも決まります。付与先（member）が、このリポジトリの principalSet（`principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/attribute.repository/OWNER/REPO`）に絞られていて、プール全体（`.../*`）になっていないことも確認します。

   ```bash
   gcloud iam service-accounts get-iam-policy GC_SA_CICD_EMAIL \
     --format='table(bindings.role, bindings.members)'
   ```

3. **サービスアカウントのメール**:
   ```bash
   gcloud iam service-accounts list

   # - CI/CD 用 → GC_SA_CICD
   # - Cloud Run サービス用 → GC_SA_CLOUD_RUN
   # - Cloud Scheduler 用 → GC_SA_SCHEDULER
   ```
   各サービスアカウントに必要な権限は [GCP サービスアカウント権限](security/gcp-service-account-permissions.md) を参照してください。

4. **Cloud Run の URL**:
   ```bash
   gcloud run services describe urawa-support-hub --region=asia-northeast1 --format='value(status.url)'

   # → CLOUD_RUN_URL
   ```

## CI/CD ワークフロー概要

### 1. CI（`.github/workflows/ci.yml`）

**トリガー**: `main` への push、Pull Request

Supabase CLI でローカル Supabase を起動し、フォーマット確認 → Lint → 型チェック → テストを実行します。テストには `SUPABASE_URL`・`SUPABASE_ANON_KEY`・`SUPABASE_SERVICE_ROLE_KEY` を環境変数として渡します。

### 2. Cloud Run デプロイ（`.github/workflows/deploy.yml`）

**トリガー**: `main` への push、手動実行

1. **認証**: Workload Identity Federation で `GC_SA_CICD` として認証
2. **Docker ビルド**: Playwright 依存関係を含むイメージをビルド
3. **レジストリ push**: `GC_REGION-docker.pkg.dev/GC_PROJECT_ID/urawa-support-hub/app` に push
4. **Cloud Run デプロイ**: サービス `urawa-support-hub` をデプロイ（メモリ 2Gi、タイムアウト 300 秒、同時実行数 1、インスタンス 0〜1、Secret Manager の `SUPABASE_SERVICE_ROLE_KEY`・`LINE_CHANNEL_ACCESS_TOKEN` を環境変数として注入）
5. **クリーンアップ**: 最新 2 つを残して古いイメージを削除

### 3. Cloud Scheduler デプロイ（`.github/workflows/deploy-scheduler.yml`）

**トリガー**: `main` への push で `infrastructure/scheduler/**` か `.github/workflows/deploy-scheduler.yml` に変更があったとき、手動実行

`infrastructure/scheduler/config.yaml` を読み、次のジョブを作成または更新します。どちらも `GC_SA_SCHEDULER` の OIDC トークンで `CLOUD_RUN_URL` を呼び出し、リトライは 3 回です。

| ジョブ                    | スケジュール（Asia/Tokyo）      | エンドポイント         |
| ------------------------- | ------------------------------- | ---------------------- |
| `daily-ticket-collection` | `0 5 * * *`（毎日 05:00）       | `/api/collect-tickets` |
| `monthly-ticket-summary`  | `0 20 1 * *`（毎月 1 日 20:00） | `/api/ticket-summary`  |

### 4. データベースマイグレーション（`.github/workflows/migrate-database.yml`）

**トリガー**: `main` への push で `supabase/migrations/**` に変更があったとき、手動実行（`dry_run`・`include_seed` を指定可能）

`SUPABASE_PROJECT_ID` で `supabase link` し、`supabase db push` でマイグレーションを適用します。

## GitHub Actions での使用例

```yaml
# Workload Identity 認証
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.GC_SA_CICD }}

# 環境変数として渡す
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## セキュリティベストプラクティス

1. **シークレットをコミットしない** - リポジトリに直接記載しない
2. **定期的にローテーション** - 90 日ごとの更新を推奨
3. **最小権限の原則** - サービスアカウントには必要な権限のみ付与
4. **使用状況を監視** - GitHub 監査ログで確認

## 検証方法

1. GitHub Actions のワークフローが正常に実行される
2. ワークフローログでシークレットがマスク（`***`）されている
3. `migrate-database.yml` は `dry_run` で手動実行して接続を確認できる

## トラブルシューティング

1. **シークレットが見つからない**
   - シークレット名が完全一致しているか（大文字小文字を区別）
   - `production` 環境のシークレットとして登録した場合、`environment: production` を持つワークフロー（`deploy.yml`・`migrate-database.yml`）からしか参照できない

2. **Workload Identity 認証エラー**
   - `WIF_PROVIDER` のリソースパスが正しいか
   - `GC_SA_CICD` のメールが正しいか
   - Workload Identity プールでこのリポジトリが許可されているか（属性マッピング・条件）

3. **Artifact Registry の権限エラー**
   - `GC_SA_CICD` に Artifact Registry への書き込み・削除権限があるか
   - Artifact Registry にリポジトリ `urawa-support-hub` が存在するか

4. **Cloud Run デプロイ失敗**
   - `GC_SA_CICD` が `GC_SA_CLOUD_RUN` として振る舞える（`roles/iam.serviceAccountUser`）か
   - Secret Manager に `SUPABASE_SERVICE_ROLE_KEY`・`LINE_CHANNEL_ACCESS_TOKEN` が存在し、`GC_SA_CLOUD_RUN` が読み取れるか

5. **Cloud Scheduler の問題**
   - `CLOUD_RUN_URL` が `https://` で始まっているか（ワークフローで検証している）
   - `GC_SA_SCHEDULER` に Cloud Run サービスの `roles/run.invoker` があるか
   - cron 式とタイムゾーン（`infrastructure/scheduler/config.yaml`）

## ローカル開発

ローカル開発では GitHub Secrets ではなく `.env` / `.env.local` を使います。詳細は[セットアップガイド](setup-guide.md#2-環境変数ファイル)を参照してください。

## 参考

- **Supabase**: [Supabase ドキュメント](https://supabase.com/docs)
- **LINE API**: [LINE Developers ドキュメント](https://developers.line.biz/ja/docs/)
- **GCP**: [Google Cloud ドキュメント](https://cloud.google.com/docs?hl=ja)
