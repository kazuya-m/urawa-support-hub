# 環境変数管理ルール

urawa-support-hub の環境変数と機密情報の管理方法です。変数の一覧と用途は[セットアップガイド](../setup-guide.md#2-環境変数ファイル)を参照してください。

## 分類

### 1. 機密情報（コミット禁止）

| 変数                        | 内容                                        |
| --------------------------- | ------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS をバイパスする Supabase の管理者キー    |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot からブロードキャストできるトークン |

`SUPABASE_ANON_KEY` は公開を前提としたキーですが、リポジトリにはコミットせず環境変数で渡します。

### 2. 非機密の設定

`SUPABASE_URL`、`GC_PROJECT_ID`、`CLOUD_TASKS_LOCATION`、`CLOUD_TASKS_SERVICE_ACCOUNT`、`CLOUD_RUN_NOTIFICATION_URL`、`CLOUD_TASKS_EMULATOR_HOST`、`CLOUD_TASKS_DEBUG`、`NODE_ENV`、`PORT`。

## 保存場所

| 環境                       | 保存場所                                                 | 機密情報の渡し方                                                                |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| ローカル（直接起動）       | `.env`（`src/config/di.ts` が `@std/dotenv` で読み込む） | ファイルに記載                                                                  |
| ローカル（Docker Compose） | `.env.local`（`docker-compose.yml` の `env_file`）       | ファイルに記載                                                                  |
| CI（GitHub Actions）       | GitHub Secrets                                           | ワークフローの `env` で渡す（[GitHub Secrets設定](../github-secrets-setup.md)） |
| 本番（Cloud Run）          | Google Secret Manager + Cloud Run の環境変数             | `deploy.yml` の `--update-secrets` で Secret Manager から注入                   |

`.gitignore` は `.env` と `.env.*` を除外し、`.env.example` だけをコミット対象にしています。

### Cloud Run

機密情報は Secret Manager に保存し、デプロイ時に環境変数として注入します。

```bash
# シークレットの登録（名前は deploy.yml の --update-secrets と一致させる）
# 値はコマンドラインに書かず、表示されない入力で渡す（シェルの履歴に残さないため）。実行後に値を貼り付けて Enter
read -rs VALUE && printf '%s' "$VALUE" | gcloud secrets create LINE_CHANNEL_ACCESS_TOKEN --data-file=- && unset VALUE

# 値の更新（新しいバージョンを追加。deploy.yml は :latest を参照する）
read -rs VALUE && printf '%s' "$VALUE" | gcloud secrets versions add LINE_CHANNEL_ACCESS_TOKEN --data-file=- && unset VALUE
```

Cloud Run のサービスアカウント（`GC_SA_CLOUD_RUN`）には、この 2 つのシークレットに対する `roles/secretmanager.secretAccessor` が必要です（[GCP サービスアカウント権限](gcp-service-account-permissions.md)）。

非機密の設定は Cloud Run サービスに直接設定します。

```bash
gcloud run services update urawa-support-hub \
  --region=asia-northeast1 \
  --update-env-vars="SUPABASE_URL=https://xxxxx.supabase.co"
```

機密情報を `--set-env-vars` / `--update-env-vars` で渡さないでください。値が Cloud Run のサービス設定にそのまま残ります。

## 検証

アプリ起動後、`GET /health`（`src/middleware/health.ts`）が `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` の有無を確認します。エラーメッセージには不足している変数名が含まれますが、値は出力しません。

その他の必須変数は、使用時に未設定であればエラーになります。

| 変数                                | 未設定時                              |
| ----------------------------------- | ------------------------------------- |
| `GC_PROJECT_ID`                     | `CloudTasksClient` の生成時にエラー   |
| `CLOUD_RUN_NOTIFICATION_URL`        | 通知タスクの登録時にエラー            |
| `SUPABASE_URL` などの Supabase 変数 | Supabase クライアントの生成時にエラー |

## ベストプラクティス

### 1. ローテーション

- **LINE チャンネルアクセストークン**: 90 日ごとに再発行
- **Supabase キー**: 90 日ごとにローテーション（ダッシュボードで JWT secret を再生成すると anon キーも変わる）
- **Supabase DB パスワード**: 漏洩の疑いがあれば即時変更（`SUPABASE_DB_PASSWORD` も更新）

GCP へのアクセスは Workload Identity Federation（GitHub Actions）と Cloud Run にアタッチしたサービスアカウントで行うため、サービスアカウントキーは発行しません。

### 2. 開発時のルール

- 実値を含む `.env` / `.env.local` をコミットしない
- チャットやメールで機密情報を共有しない
- 新しい環境変数を追加したら `.env.example` と[セットアップガイド](../setup-guide.md)に追記する
- ログに機密情報の値を出力しない

## トラブルシューティング

**環境変数が読み込まれない**

- `deno task dev:local` は `.env`、`deno task dev` は `.env.local` を読む。編集したファイルが正しいか確認する
- Docker Compose では `SUPABASE_URL` と `CLOUD_TASKS_EMULATOR_HOST` が `docker-compose.yml` で上書きされる

**ファイル権限**

```bash
chmod 600 .env .env.local
```

## 緊急時の対応

**キーの漏洩**

1. 漏洩したキーを発行元（Supabase ダッシュボード、LINE Developers コンソール）で再発行する
2. Secret Manager に新しいバージョンを追加し、Cloud Run を再デプロイする（`deploy.yml` を手動実行）
3. CI 用の GitHub Secrets とローカルの `.env` / `.env.local` を更新する
4. Cloud Logging で不審なアクセスがないか確認する

**環境変数が原因のサービス障害**

1. `GET /health` の結果を確認する
2. Cloud Run のリビジョンに設定されている環境変数とシークレットを確認する（`gcloud run services describe urawa-support-hub --region=asia-northeast1`）
3. Cloud Logging でエラーログを確認する

## チェックリスト

### 新しい環境のセットアップ

- [ ] `.env.example` を `.env` / `.env.local` にコピーし、値を入力
- [ ] `.env` / `.env.local` が Git の管理外であることを確認（`git status`）
- [ ] `GET /health` が `healthy` を返すことを確認

### 認証情報のローテーション

- [ ] 発行元で新しい認証情報を生成
- [ ] Secret Manager に新しいバージョンを追加し、Cloud Run を再デプロイ
- [ ] GitHub Secrets とローカルの環境変数ファイルを更新
- [ ] 通知送信などの動作を確認
- [ ] 古い認証情報を無効化
