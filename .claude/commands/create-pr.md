---
description: "CLAUDE.md規則に従ってGitHub Pull Requestを作成するカスタムコマンド。日本語タイトル、自動issue連携、テスト計画を含む適切なPR作成をサポート"
---

# GitHub Pull Request 作成コマンド

GitHub pull
requestを作成するカスタムスラッシュコマンドです。CLAUDE.mdの規則に従い、適切なPRを作成します。

## 実行手順

### 1. 現在の状況確認

```bash
git status
git diff
git log --oneline -10
```

### 2. ブランチとリモート状態確認

```bash
git branch -a
git remote -v
```

### 3. 変更内容の分析

現在のブランチと`main`ブランチとの差分を確認：

```bash
git diff main...HEAD
```

### 4. リモートへのプッシュ（必要な場合）

```bash
# ブランチがリモートに存在しない場合
git push -u origin <current-branch-name>

# 既存ブランチの場合
git push origin <current-branch-name>
```

### 5. Pull Request作成

以下のコマンドでPRを作成：

```bash
gh pr create --title "<Japanese-title> #<issue-number>" --body "$(cat <<'EOF'
## 概要

- 実装内容の概要

## 実装内容

- 詳細な変更内容
- 実装した機能や修正した問題

## テスト計画

- [ ] 実行確認済み
- [ ] タイプチェック確認済み
- [ ] Lintチェック確認済み

🤖 Generated with [Claude Code](https://claude.ai/code)

Closes #<issue-number>
EOF
)"
```

## PR作成要件

### 🎯 必須要件（CLAUDE.md準拠）

#### タイトル要件

- **言語**: 日本語を使用
- **フォーマット**: `<実装内容> #<issue-number>`
- **例**: `pre-commitフック実装（Denoネイティブ）#6`

#### 説明文要件

- **言語**: 日本語で記述
- **自動クローズ**: `Closes #<issue-number>`を必ず含める
- **代替キーワード**: `Fixes #<issue-number>`, `Resolves #<issue-number>`も使用可能

#### 説明文構造

```markdown
## 概要

- 実装内容の概要

## 実装内容

- 詳細な変更内容

## テスト計画

- 確認済み項目のチェックリスト

🤖 Generated with [Claude Code](https://claude.ai/code)

Closes #<issue-number>
```

### 🔍 事前確認事項

1. **作業ツリーの状態確認**
   - コミット済みの変更があること
   - 未コミットの変更がないこと

2. **ブランチ命名規則確認**
   - `feature/#<issue-number>_<description>`
   - `fix/#<issue-number>_<description>`

3. **リモートブランチ状態確認**
   - ブランチがリモートに存在するか
   - 最新の変更がプッシュされているか

### 📝 PR作成後の確認

1. **GitHub上での確認**
   - PR作成完了の確認
   - issueとの自動リンク確認
   - ラベルやレビュー担当者の設定

2. **PR URL取得**
   - 作成されたPRのURLを取得し、ユーザーに提示

## 使用例

### 基本的な使用例

```bash
# 現在のブランチ: feature/#21_update-architecture-docs
# 対象issue: #21

gh pr create --title "アーキテクチャドキュメント更新とスラッシュコマンド追加 #21" --body "..."
```

### エラーハンドリング

- **未コミットの変更がある場合**: コミットを促すメッセージを表示
- **リモートブランチが存在しない場合**: プッシュコマンドを提示
- **GitHub認証エラー**: `gh auth login`を促す

## 注意事項

- **コミット権限**: Claudeは直接コミットできないため、すべてのgitコマンドをユーザーがコピペして実行
- **issue番号**: 適切なissue番号を指定すること
- **CLAUDE.md準拠**: すべてのPR作成要件に従うこと
- **日本語使用**: タイトルと説明文は日本語で記述
