# GitHub Secrets 設定ガイド

このガイドでは、浦和サポートハブプロジェクトのGitHub Secrets設定方法を説明します。

## 概要

GitHub Secretsは、CI/CDパイプラインやGitHub
Actionsワークフローで必要となる機密情報を安全に保存するために使用されます。これらのシークレットは暗号化され、ワークフロー実行時のみアクセス可能です。

## 必要なシークレット

GitHubリポジトリに以下のシークレットを設定する必要があります：

### 1. Supabase設定

| シークレット名              | 説明                               | 必須 | 値の例                      |
| --------------------------- | ---------------------------------- | ---- | --------------------------- |
| `SUPABASE_URL`              | SupabaseプロジェクトのURL          | ✅   | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY`         | Supabase匿名キー（公開可能）       | ✅   | `eyJhbGci...`               |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロールキー（秘密） | ✅   | `eyJhbGci...`               |

### 2. LINE Messaging API

| シークレット名              | 説明                               | 必須 | 値の例          |
| --------------------------- | ---------------------------------- | ---- | --------------- |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Botチャンネルアクセストークン | ✅   | `Bearer xxx...` |
| `LINE_GROUP_ID`             | 対象LINEグループID（オプション）   | ⚪   | `Cxxxxx...`     |

### 3. Google Cloud Platform（Workload Identity）

| シークレット名    | 説明                                   | 必須 | 値の例                                                                                                        |
| ----------------- | -------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| `GC_PROJECT_ID`   | GCPプロジェクトID                      | ✅   | `urawa-support-hub`                                                                                           |
| `GC_REGION`       | デフォルトGCPリージョン                | ✅   | `asia-northeast1`                                                                                             |
| `WIF_PROVIDER`    | Workload Identity Federationプロバイダ | ✅   | `projects/1081589382080/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider` |
| `GC_SA_CICD`      | CI/CDサービスアカウントメール          | ✅   | `github-actions-cicd@urawa-support-hub.iam.gserviceaccount.com`                                               |
| `GC_SA_SCHEDULER` | Cloud Schedulerサービスアカウント      | ✅   | `cloud-scheduler-sa@urawa-support-hub.iam.gserviceaccount.com`                                                |
| `GC_SA_CLOUD_RUN` | Cloud Runサービスアカウント            | ✅   | `cloud-run-service@urawa-support-hub.iam.gserviceaccount.com`                                                 |
| `CLOUD_RUN_URL`   | Cloud RunサービスURL                   | ✅   | `https://urawa-support-hub-xxxxx-an.a.run.app`                                                                |

## セットアップ手順

### ステップ1: リポジトリ設定へ移動

1. GitHubリポジトリにアクセス
2. **Settings**タブをクリック
3. 左サイドバーで **Secrets and variables** → **Actions** をクリック

### ステップ2: リポジトリシークレットを追加

各必須シークレットについて：

1. **New repository secret**をクリック
2. **Name**を入力（上記の表と完全に一致させる）
3. **Value**を入力
4. **Add secret**をクリック

### ステップ3: シークレット値の取得方法

#### Supabase認証情報

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にログイン
2. プロジェクトを選択
3. **Settings** → **API** に移動
4. 以下をコピー：
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
   - service_role secret key → `SUPABASE_SERVICE_ROLE_KEY`

#### LINE Messaging API

1. [LINE Developersコンソール](https://developers.line.biz/)にログイン
2. チャンネルを選択
3. **Messaging API**タブに移動
4. **チャンネルアクセストークン**をコピー → `LINE_CHANNEL_ACCESS_TOKEN`

#### Google Cloud Platform（Workload Identity）

1. **プロジェクト情報の取得**:
   - [GCPコンソール](https://console.cloud.google.com/)にアクセス
   - プロジェクトを選択
   - プロジェクトIDをコピー → `GC_PROJECT_ID`
   - リージョンを設定 → `GC_REGION`（例：`asia-northeast1`）

2. **Workload Identityプロバイダーの取得**:
   ```bash
   # Workload Identityプールの一覧表示
   gcloud iam workload-identity-pools list --location=global

   # プール内のプロバイダー一覧表示
   gcloud iam workload-identity-pools providers list \
     --location=global \
     --workload-identity-pool=github-actions-pool

   # プロバイダーの完全なリソース名をコピー → WIF_PROVIDER
   ```

3. **サービスアカウントのメール取得**:
   ```bash
   # サービスアカウント一覧表示
   gcloud iam service-accounts list

   # 以下のメールをコピー：
   # - CI/CD操作用 → GC_SA_CICD
   # - Cloud Scheduler用 → GC_SA_SCHEDULER
   # - Cloud Runサービス用 → GC_SA_CLOUD_RUN
   ```

4. **Cloud RunのURL取得**:
   ```bash
   # Cloud Runサービス一覧表示
   gcloud run services list --region=asia-northeast1

   # サービスURLをコピー → CLOUD_RUN_URL
   ```

## セキュリティベストプラクティス

1. **シークレットをコミットしない** - リポジトリに直接記載しない
2. **定期的にローテーション** - 90日ごとの更新を推奨
3. **最小権限の原則** - 必要な権限のみ付与
4. **使用状況を監視** - GitHub監査ログで確認
5. **所有者を文書化** - ローテーションスケジュールも記載

## 検証方法

シークレットが適切に設定されているか確認：

1. GitHub Actionsワークフローが正常に実行される
2. ワークフローログでシークレットがマスク（`***`）される
3. ステージング環境で先にテスト

## トラブルシューティング

### よくある問題

1. **「シークレットが見つからない」エラー**
   - シークレット名が完全一致しているか確認（大文字小文字を区別）
   - 正しいリポジトリに追加されているか確認
   - ワークフローにシークレットへのアクセス権限があるか確認

2. **Workload Identity認証エラー**
   - `WIF_PROVIDER`リソースパスが正しいか確認
   - `GC_SA_CICD`のサービスアカウントメールを確認
   - Workload IdentityプールにGitHubリポジトリが許可されているか確認
   - リポジトリとサブジェクトの属性マッピングを確認

3. **Artifact Registry権限エラー**
   - サービスアカウントに`artifactregistry.writer`ロールがあるか確認
   - Artifact Registryにリポジトリが存在するか確認
   - シークレット内のプロジェクトIDが正しいか確認
   - Docker認証設定を確認

4. **Cloud Runデプロイ失敗**
   - Cloud Run用サービスアカウントの権限を確認
   - メモリとタイムアウト設定を確認
   - コンテナイメージが適切にビルド・プッシュされているか確認
   - Cloud Runサービスアカウント設定を確認

5. **Cloud Scheduler問題**
   - ターゲットCloud RunサービスURLを確認
   - OIDCサービスアカウント設定を確認
   - スケジューラーサービスアカウントにinvoke権限があるか確認
   - cron式とタイムゾーン設定を確認

## ローカル開発

ローカル開発では`.env`ファイルを使用：

```bash
# テンプレートをコピー
cp .env.example .env

# 値を編集
nano .env
```

⚠️ **重要**: `.env`ファイルは絶対にバージョン管理にコミットしないでください

## CI/CDワークフロー概要

プロジェクトは主に2つのGitHub Actionsワークフローを使用：

### 1. Cloud Runデプロイ（`.github/workflows/deploy.yml`）

**トリガー**: `main`ブランチまたは`feature/#33_github-actions-cicd-pipeline`へのプッシュ

**処理フロー**:

1. **認証**: Workload Identity Federationで認証
2. **Dockerビルド**: Playwright依存関係を含むアプリケーションイメージをビルド
3. **レジストリプッシュ**: Google Artifact Registryにイメージをプッシュ
4. **Cloud Runデプロイ**: 指定設定でコンテナをCloud Runにデプロイ
5. **クリーンアップ**: 古いイメージを削除（最新2つを保持）

**主要設定**:

- メモリ: 2GB
- タイムアウト: 300秒
- 同時実行数: 1
- オートスケーリング: 0-1インスタンス

### 2. Cloud Schedulerデプロイ（`.github/workflows/deploy-scheduler.yml`）

**トリガー**: スケジューラー設定ファイルの変更時

**処理フロー**:

1. **認証**: Workload Identity Federationで認証
2. **スケジューラー更新**: Cloud Schedulerジョブを作成または更新
3. **設定**: 毎日5:00 AM JSTで実行を設定

**スケジューラー設定**:

- スケジュール: `0 5 * * *`（毎日5:00 AM JST）
- ターゲット: Cloud Runサービスの`/api/collect-tickets`エンドポイント
- 認証: サービスアカウントによるOIDC
- リトライ: 指数バックオフで3回試行

## GitHub Actionsでの使用

GitHub Actionsではシークレットが自動的に利用可能：

```yaml
# Workload Identity認証
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.GC_SA_CICD }}

# 環境変数
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## サポート

問題が発生した場合の参照先：

- **Supabase**: [Supabaseドキュメント](https://supabase.com/docs)
- **LINE API**: [LINE Developersドキュメント](https://developers.line.biz/ja/docs/)
- **GCP**: [Google Cloudドキュメント](https://cloud.google.com/docs?hl=ja)
