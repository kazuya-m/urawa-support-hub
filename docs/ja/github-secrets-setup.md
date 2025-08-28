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

### 3. Discord設定

| シークレット名        | 説明                              | 必須 | 値の例                                 |
| --------------------- | --------------------------------- | ---- | -------------------------------------- |
| `DISCORD_WEBHOOK_URL` | エラー通知用Discord Webhook URL   | ✅   | `https://discord.com/api/webhooks/...` |
| `DISCORD_CHANNEL_ID`  | DiscordチャンネルID（オプション） | ⚪   | `123456789012345678`                   |

### 4. Google Cloud Platform

| シークレット名            | 説明                                 | 必須 | 値の例                   |
| ------------------------- | ------------------------------------ | ---- | ------------------------ |
| `GCP_PROJECT_ID`          | GCPプロジェクトID                    | ✅   | `urawa-support-hub-prod` |
| `GCP_SERVICE_ACCOUNT_KEY` | サービスアカウントJSONキー（Base64） | ✅   | Base64エンコード済みJSON |
| `GCP_REGION`              | デフォルトGCPリージョン              | ⚪   | `asia-northeast1`        |

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

#### Discord Webhook

1. Discordを開き、サーバーに移動
2. チャンネルを右クリック → **チャンネルの編集**
3. **連携サービス** → **ウェブフック** に移動
4. ウェブフックを作成または選択
5. **ウェブフックURL**をコピー → `DISCORD_WEBHOOK_URL`

#### Google Cloud Platform

1. [GCPコンソール](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. ドロップダウンからプロジェクトIDをコピー → `GCP_PROJECT_ID`

サービスアカウントの場合：

1. **IAMと管理** → **サービスアカウント** に移動
2. サービスアカウントを作成または選択
3. **鍵** → **鍵を追加** → **新しい鍵を作成** をクリック
4. JSON形式を選択
5. JSONファイルをBase64エンコード：
   ```bash
   base64 -i service-account-key.json | tr -d '\n' > encoded-key.txt
   ```
6. 内容をコピー → `GCP_SERVICE_ACCOUNT_KEY`

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

2. **認証エラー**
   - シークレット値が完全か確認（切り詰められていないか）
   - 認証情報の有効期限を確認
   - フォーマットを確認（余分なスペースや改行がないか）

3. **Base64エンコード問題（GCP）**
   - 改行なしの適切なBase64エンコードを使用
   - エンコード前にJSONが有効か確認

## ローカル開発

ローカル開発では`.env`ファイルを使用：

```bash
# テンプレートをコピー
cp .env.example .env

# 値を編集
nano .env
```

⚠️ **重要**: `.env`ファイルは絶対にバージョン管理にコミットしないでください

## GitHub Actionsでの使用

GitHub Actionsではシークレットが自動的に利用可能：

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## サポート

問題が発生した場合の参照先：

- **Supabase**: [Supabaseドキュメント](https://supabase.com/docs)
- **LINE API**: [LINE Developersドキュメント](https://developers.line.biz/ja/docs/)
- **Discord**: [Discord開発者ポータル](https://discord.com/developers/docs)
- **GCP**: [Google Cloudドキュメント](https://cloud.google.com/docs?hl=ja)
