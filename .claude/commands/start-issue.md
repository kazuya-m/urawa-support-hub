# GitHub Issue から新しいタスクを開始

GitHub issueから作業するタスクを選択し、適切な命名規則でブランチを作成します。

まず、現在オープンなGitHub issueの一覧を取得します：

```bash
gh issue list --state open --limit 15 --json number,title,labels --format json
```

取得したissueを表示し、どのissueに取り組むかを決定してください。

選択後、以下の命名規則に従ってブランチを作成します：

**命名規則:**

- Feature: `feature/#<issue-number>_<description>`
- Bug fix: `fix/#<issue-number>_<description>`

**例:** `feature/#21_update-architecture-docs-external-scraping`

issueを選択したら、番号を教えてください。適切なブランチ名を生成し、ブランチを作成してチェックアウトします。

選択されたissue番号: **{入力待ち}**

---

## 実行手順

1. 上記コマンドでissue一覧を確認
2. 作業したいissueの番号を選択
3. 以下のコマンドでブランチを作成:

```bash
# 選択されたissueに基づいてブランチ名を生成
# 例: issue #22 の場合
git checkout -b "feature/#22_implement-external-scraping-environment"
```

4. ブランチ作成完了後、作業開始

**重要:** CLAUDE.mdの「🚨 CRITICAL: Always create a new branch before starting
implementation」に従い、必ずmainブランチから新しいブランチを作成してください。
