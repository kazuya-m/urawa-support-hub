# Pre-commit コマンド

このコマンドは以下の処理を順次実行し、コミット用のコマンドを生成します：

1. `deno check` でタイプチェック
2. タイプエラーがある場合は処理を停止し、エラーファイルを提示
3. `deno fmt` でコードをフォーマット
4. 変更されたファイルを適切な粒度で分割
5. 各変更に対するコミットメッセージを生成
6. ユーザーがコピペできる `git add` と `git commit` コマンドを出力

## 実行手順

### 1. タイプチェック実行

```bash
deno check src/**/*.ts
```

**⚠️ タイプエラーがある場合：**

- エラーが発生したファイル一覧を表示
- 処理を停止（以降の fmt やコミット処理は実行しない）
- ユーザーにエラー修正を促す

### 2. コードのフォーマット実行（タイプチェック成功時のみ）

```bash
deno fmt
```

### 3. 現在の変更状況を確認

```bash
git status
git diff --cached
git diff
```

### 4. 変更を分析して適切な粒度で分割

変更されたファイルを以下の基準で分割：

- 機能単位での分割
- ファイルタイプ別の分割（設定ファイル、実装ファイル、テストファイルなど）
- 関連性の高いファイル同士をグループ化

### 5. コミットメッセージ生成

CLAUDE.mdの規則に従い、以下の形式でメッセージを生成：

- **Good**: "add Ticket type definition"
- **Good**: "implement SupabaseTicketRepository save method"
- **Bad**: "implement everything for ticket management"

### 6. ユーザー実行用コマンド出力

各グループに対して以下の形式で出力：

```bash
# 変更グループ 1: 型定義の追加
git add src/domain/entities/NewType.ts src/domain/entities/index.ts
git commit -m "add NewType entity with validation rules"

# 変更グループ 2: テストファイルの追加  
git add src/domain/entities/__tests__/NewType.test.ts
git commit -m "add unit tests for NewType entity"
```

## 注意事項

- タイプチェックエラーがある場合は即座に処理停止
- Claude にはコミット権限がないため、すべてのコマンドをユーザーがコピペして実行
- CLAUDE.md の commit granularity に従った適切な粒度での分割
- 日本語でのコミットメッセージ生成（必要に応じて）
