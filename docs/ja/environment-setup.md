# 環境セットアップガイド

## 前提条件

### 必要なソフトウェア

1. **Deno Runtime 2.x**
   ```bash
   # Denoのインストール
   curl -fsSL https://deno.land/install.sh | sh

   # インストール確認
   deno --version
   ```

2. **Supabase CLI**
   ```bash
   # npmでインストール
   npm install -g supabase

   # インストール確認
   supabase --version
   ```

3. **Google Cloud CLI**
   ```bash
   # gcloud CLIのインストール
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL

   # インストール確認
   gcloud --version
   ```

4. **Docker**
   ```bash
   # Dockerのインストール（プラットフォーム固有）
   # macOS: Docker Desktopをダウンロード
   # Linux: パッケージマネージャーを使用

   # インストール確認
   docker --version
   ```

5. **Git**
   ```bash
   git --version
   ```

## ローカル開発環境セットアップ

### 1. リポジトリセットアップ

```bash
# リポジトリクローン
git clone https://github.com/kazuya-m/urawa-support-hub.git
cd urawa-support-hub

# プロジェクト構造確認
ls -la
```

## 2. ローカル開発環境

### 2.1 Supabase ローカル開発

```bash
# Supabase初期化（済）
supabase init

# ローカル環境起動
supabase start

# 状態確認
supabase status

# 出力例:
# API URL: http://127.0.0.1:54321
# anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 環境変数設定

**ローカル開発用（.env）**

```bash
# .envファイル作成（設定済み）
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**GitHub Secrets設定（本番用）**

```bash
# GitHub Settings > Secrets で設定
SUPABASE_URL: https://your-project.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

    - メールアドレス: 管理者のメールアドレス

```
#### 2.1.2 LINE Bot 詳細設定
```

応答メッセージ: オフ（重要） あいさつメッセージ: オフ Webhook: オフ（Push通知のみ使用）
自動応答メッセージ: オフ 友だち追加時のあいさつ: カスタム設定

```
#### 2.1.3 カスタムあいさつメッセージ例
```

🏟️ 浦和レッズアウェイチケット通知Botです

このBotは以下の通知を自動送信します： 📅 販売開始前日 20:00 ⏰ 販売開始1時間前 🚨 販売開始15分前

グループチャットに招待してご利用ください。

```
#### 2.1.4 Messaging API設定
```

Channel Access Token (long-lived): 【発行】→【後でSupabaseに設定】 Use webhooks: オフ

```
#### 2.1.5 グループチャット設定
```

グループ名: 浦和レッズアウェイチケット通知 参加メンバー: 通知を受け取りたいサポーター グループ画像:
浦和レッズロゴ（任意）

```
### 2.2 Discord Webhook セットアップ（システム監視用）

#### 2.2.1 Discordサーバー作成

1. **新規サーバー作成**
```

手順:

1. Discordアプリまたはブラウザでログイン
2. 左サイドバーの「+」ボタンをクリック
3. 「サーバーを作成」→「自分用」
4. サーバー名: "urawa-support-hub-monitoring"

```
2. **チャンネル作成**
```

テキストチャンネル:

- #system-alerts（システムエラー通知）
- #health-reports（定期健康状態レポート）
- #deployment-logs（デプロイメント通知）

```
#### 2.2.2 Webhook作成

1. **Webhook設定**
```

手順:

1. #system-alertsチャンネル設定 → 連携サービス → ウェブフック
2. 「ウェブフックを作成」をクリック
3. 名前: "urawa-support-hub-alerts"
4. アバター: 浦和レッズロゴ（任意）
5. 「ウェブフックURLをコピー」

````
2. **テスト送信**
```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "embeds": [{
      "title": "🧪 Discord通知テスト",
      "description": "urawa-support-hub監視システムが正常に動作しています",
      "color": 65280,
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
    }]
  }'
````

#### 2.2.3 必要情報の保存

以下の情報をメモしてSupabase環境変数に設定：

```bash
# LINE Bot設定情報
LINE_CHANNEL_ACCESS_TOKEN="YOUR_LONG_LIVED_ACCESS_TOKEN"
LINE_GROUP_CHAT_ID="YOUR_GROUP_CHAT_ID"

# Discord Webhook設定情報
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_URL"

# オプション：開発環境用
DISCORD_DEV_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_DEV_WEBHOOK_URL"

# 補助情報（任意）
LINE_CHANNEL_SECRET="YOUR_CHANNEL_SECRET"
LINE_BOT_USER_ID="YOUR_BOT_USER_ID"
```

## 3. Supabase セットアップ

### 3.1 Supabase CLI インストール

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Windows (Chocolatey)
choco install supabase

# Linux/WSL
curl -sSfL https://supabase.com/install.sh | sh

# npm（全プラットフォーム）
npm install -g supabase

# インストール確認
supabase --version
```

### 3.2 Supabase アカウント・プロジェクト作成

#### 3.2.1 プロジェクト作成

1. **Supabase Dashboard でプロジェクト作成**
   ```
   手順:
   1. https://supabase.com にアクセス
   2. 「Start your project」をクリック
   3. GitHubアカウントでサインアップ/ログイン
   4. 「New project」をクリック

   プロジェクト設定:
     - プロジェクト名: urawa-support-hub
     - データベースパスワード: 【強力なパスワードを生成・保存】
     - リージョン: Northeast Asia (Tokyo) - ap-northeast-1
     - 料金プラン: Free tier
   ```

#### 3.2.2 プロジェクト情報取得・保存

```
プロジェクト設定画面から以下を取得:

プロジェクトURL: https://YOUR_PROJECT_ID.supabase.co
API Keys:
  - anon/public key: YOUR_ANON_KEY
  - service_role/secret key: YOUR_SERVICE_ROLE_KEY

Database:
  - Host: db.YOUR_PROJECT_ID.supabase.co
  - Database name: postgres
  - Port: 5432
  - User: postgres
  - Password: 【設定したパスワード】
```

### 3.3 ローカル開発環境セットアップ

```bash
# プロジェクトディレクトリ作成・移動
mkdir urawa-support-hub
cd urawa-support-hub

# Supabaseプロジェクト初期化
supabase init

# Supabaseにログイン
supabase login

# リモートプロジェクトとリンク
supabase link --project-ref YOUR_PROJECT_ID

# ローカル環境起動（初回は時間がかかる）
supabase start

# 起動確認
supabase status
```

**ローカル環境起動後の情報例:**

```
         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: your-super-secret-jwt-token-with-at-least-32-characters-long
        anon key: your-anon-key
service_role key: your-service-role-key
```

### 3.4 環境変数設定（本番環境）

```bash
# Supabase本番環境の環境変数設定

# LINE Bot設定
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN="YOUR_ACTUAL_LINE_TOKEN"
supabase secrets set LINE_GROUP_CHAT_ID="YOUR_ACTUAL_GROUP_ID"

# Discord Webhook設定
supabase secrets set DISCORD_WEBHOOK_URL="YOUR_ACTUAL_DISCORD_WEBHOOK_URL"

# オプション設定
supabase secrets set DISCORD_DEV_WEBHOOK_URL="YOUR_DEV_WEBHOOK_URL"
supabase secrets set DEBUG_MODE="false"
supabase secrets set LOG_LEVEL="info"

# 環境変数一覧確認
supabase secrets list

# 特定の環境変数削除（必要に応じて）
# supabase secrets unset DEBUG_MODE
```

### 3.5 データベーススキーマ適用

```bash
# マイグレーションファイル作成（自動生成済みなら不要）
supabase migration new initial_schema

# ローカル環境でマイグレーション適用・確認
supabase db reset

# ローカルSupabase Studioでデータ確認
# http://localhost:54323 にアクセス

# 本番環境にマイグレーション適用
supabase db push

# マイグレーション履歴確認
supabase migration list

# スキーマ差分確認
supabase db diff
```

## 4. 開発環境セットアップ

### 4.1 必要なツール・拡張機能

```bash
# Deno インストール（Edge Functions用）
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Windows（PowerShell）
iwr https://deno.land/install.ps1 -useb | iex

# 環境変数設定（~/.bashrc または ~/.zshrc）
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"

# Deno インストール確認
deno --version

# Git設定（未設定の場合）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**VS Code拡張機能（推奨）:**

```
必須:
- Deno (denoland.vscode-deno)
- Supabase (supabase.supabase)

推奨:
- TypeScript Importer (pmneo.tsimporter)
- Prettier (esbenp.prettier-vscode)
- Error Lens (usernamehw.errorlens)
- Thunder Client (rangav.vscode-thunder-client) # API テスト用
```

### 4.2 プロジェクト初期化

````bash
# プロジェクト初期化（すでに作成済みの場合はスキップ）
mkdir urawa-support-hub
cd urawa-support-hub

# Git初期化
git init

# .gitignore作成
cat > .gitignore << 'EOF'
# Supabase
.env
.env.*
!.env.example
.vscode/
supabase/.branches
supabase/.temp

# Deno
.deno/

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
*.swp
*.swo

# Node.js (if needed for tools)
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
EOF

# README作成
cat > README.md << 'EOF'
# urawa-support-hub

浦和レッズサポーター向け総合支援ツール

## 概要
アウェイ戦チケット販売情報を自動監視し、LINE通知を送信するシステム

## セットアップ
詳細は `docs/environment_setup_document.md` を参照

## 開発
```bash
# ローカル環境起動
supabase start

# 開発サーバー起動
supabase functions serve

# テスト実行
deno test --allow-all
````

EOF

````
### 4.3 Deno設定ファイル作成

```bash
# deno.json作成
cat > deno.json << 'EOF'
{
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true
  },
  "importMap": "./import_map.json",
  "tasks": {
    "start": "supabase start",
    "dev": "supabase functions serve --debug",
    "test": "deno test --allow-all --coverage=coverage",
    "deploy": "supabase functions deploy",
    "db:reset": "supabase db reset",
    "db:push": "supabase db push",
    "lint": "deno lint",
    "fmt": "deno fmt"
  },
  "lint": {
    "files": {
      "include": ["src/", "supabase/functions/"],
      "exclude": ["supabase/functions/_shared/"]
    }
  },
  "fmt": {
    "options": {
      "useTabs": false,
      "lineWidth": 100,
      "indentWidth": 2,
      "singleQuote": true
    }
  }
}
EOF

# import_map.json作成
cat > import_map.json << 'EOF'
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "playwright": "https://deno.land/x/playwright@0.4.0/mod.ts",
    "std/": "https://deno.land/std@0.208.0/",
    "@/": "./src/",
    "date-fns": "https://esm.sh/date-fns@2.30.0",
    "testing/": "https://deno.land/std@0.208.0/testing/"
  }
}
EOF
````

## 5. 開発ワークフロー

### 5.1 Claude Codeを使った開発手順

```bash
# 1. プロジェクト開始
claude-code start

# 2. 基本構造作成
claude-code create "プロジェクトの基本ディレクトリ構造を作成してください"

# 3. 型定義から開始
claude-code create src/types/Ticket.ts "Ticket型とScrapedTicketData型を定義してください"

# 4. リポジトリ層実装
claude-code implement "TicketRepositoryインターフェースとSupabaseTicketRepositoryを実装してください"

# 5. サービス層実装
claude-code implement "DiscordNotificationServiceを実装してください"

# 6. テスト実行
claude-code test

# 7. デプロイ
claude-code deploy "本番環境にデプロイしてください"
```

### 5.2 手動開発手順（Claude Code無し）

```bash
# 1. ローカル環境起動
supabase start

# 2. 開発用Edge Function作成
supabase functions new test-notification

# 3. 実装とテスト
deno test --allow-all

# 4. ローカル関数テスト
supabase functions serve

# 5. 本番デプロイ
supabase functions deploy
```

## 6. トラブルシューティング

### 6.1 よくある問題

**Supabase接続エラー**

```bash
# プロジェクトリンクの確認
supabase status

# 再リンク
supabase link --project-ref YOUR_PROJECT_ID
```

**Discord通知が届かない**

```bash
# Webhook URLテスト
curl -X POST "$DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content": "テスト通知"}'
```

**Deno権限エラー**

```bash
# 適切な権限でテスト実行
deno test --allow-net --allow-env --allow-read
```

### 6.2 デバッグ設定

```bash
# デバッグモード有効化
supabase secrets set DEBUG_MODE="true"
supabase secrets set LOG_LEVEL="debug"

# ログ確認
supabase functions logs daily-check
```

これで環境設定が完了です。次は実装段階に進むことができます。
