# urawa-support-hub

浦和レッズサポーター向けアウェイ戦チケット販売情報自動通知システム

## ドキュメント

このリポジトリの設計・要件などのドキュメントは `/docs` ディレクトリにまとめられています。

- [要件定義書](docs/要件定義書.md)
- [技術選定書](docs/技術選定書.md)
- [基本設計書](docs/基本設計書.md)
- [詳細設計書](docs/詳細設計書.md)
- [環境設定書](docs/環境設定書.md)

## 開発環境セットアップ

### 1. 環境変数設定

```bash
cp .env.example .env
```

### 2. ローカルSupabase起動

```bash
supabase start
```

### 3. テスト実行

```bash
# 単体テスト
deno test

# 統合テスト（ローカルSupabase必要）
deno test --allow-all

# 型チェック
deno check src/

# Lintチェック
deno lint src/
```

## CI/CD環境変数

GitHub Actionsで実行する場合は以下の環境変数を設定：

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

**注意**: 
- `SUPABASE_ANON_KEY`: クライアントサイド用（公開可能、RLS制限あり）
- `SUPABASE_SERVICE_ROLE_KEY`: サーバーサイド用（秘匿必須、全権限）
- 統合テストではSERVICE_ROLE_KEYを使用してRLS制限を回避
