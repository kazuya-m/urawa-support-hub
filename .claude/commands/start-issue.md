---
description: 'Retrieve open GitHub issues list, create feature/fix branches following CLAUDE.md naming conventions based on selected issue, and start new development tasks'
arguments:
  - name: issue_number
    description: 'GitHub issue number to start working on'
    required: false
---

# Language and Instructions

- 重要：必ず日本語で応答してください（MUST communicate in Japanese）
- ユーザーとのやり取りは全て日本語で行ってください
- 説明や推奨事項も日本語で提供してください
- ステータス更新やガイダンスも日本語で行ってください

# Start New Task from GitHub Issue

Select a task to work on from GitHub issues and create branches with proper naming conventions.

## Usage

- `/start-issue` - Show all open issues and prompt for selection
- `/start-issue <number>` - Directly start working on the specified issue number

First, update the roadmap with the latest issue status, then retrieve the list of currently open
GitHub issues:

**STEP 1: Update Issue Priority Roadmap** Update docs/issue-priority-roadmap.md to reflect the
latest issue status before proceeding with development:

```bash
# Check latest issue status (all issues - open and closed)
gh issue list --state all --limit 20

# Update roadmap based on latest status
# - Mark recently completed issues as ✅ COMPLETED
# - Add new issues to appropriate priority categories
# - Update priority order based on current status
# - Adjust next steps recommendations
```

**STEP 2: Retrieve Open Issues**

**IMPORTANT**: Only reference GitHub issues with STATUS=Open.

```bash
gh issue list --state open --limit 15 --json number,title,labels
```

If an issue number is provided as argument, proceed directly with that issue. Otherwise:

1. **MANDATORY**: Update roadmap first using STEP 1 above
2. Check if docs/issue-priority-roadmap.md exists for priority context
3. Display issues with available priority information:
   - If roadmap exists: Show roadmap-based priorities and phase information
   - If no roadmap: Show issues with label-based priority (priority/high, priority/critical, etc.)
4. Present recommended next issues based on available information

After selection, create branches following these naming conventions:

**Naming Conventions:**

- Feature: `feature/#<issue-number>_<description>`
- Bug fix: `fix/#<issue-number>_<description>`

**Example:** `feature/#21_update-architecture-docs-external-scraping`

---

## Execution Steps

### When no issue number is provided:

1. **MANDATORY**: Execute STEP 1 - Update roadmap with latest issue status
2. Check issue list with the above command
3. Check if docs/issue-priority-roadmap.md exists
4. Display issues with priority context:

   **If roadmap exists:**
   - 🔴 Critical (Phase-based priorities from roadmap)
   - 🟠 High (Phase-based priorities)
   - 📋 Next Steps priority order from roadmap (updated with latest status)
   - Show completion status and blockers from roadmap

   **If no roadmap (fallback):**
   - Show issues grouped by GitHub labels (priority/critical, priority/high, bug, enhancement)
   - Sort by creation date (newest first) within each priority group
   - Highlight issues with recent activity

5. Recommend next issues based on updated roadmap information
6. Prompt user to select one or suggest most urgent task
7. Create branch based on selected issue

### When issue number is provided as argument:

1. **OPTIONAL**: Update roadmap if issue status might have changed recently
2. Fetch the specific issue details
3. Create branch directly based on the issue

### Branch Creation:

```bash
# Generate branch name based on selected issue
# Example: for issue #22
git checkout -b "feature/#22_implement-external-scraping-environment"
```

**Important:** Following CLAUDE.md's "🚨 CRITICAL: Always create a new branch before starting
implementation", always create a new branch from the main branch.

### Logic Flow:

- If `issue_number` argument provided → (optionally update roadmap) → fetch that specific issue and
  create branch
- If no argument → update roadmap → show prioritized issue list with available context and recommend
  next steps

### Sample Output Examples:

#### When roadmap exists:

```
📋 Current Development Status (based on updated issue-priority-roadmap.md):

🔴 CRITICAL - Next Priority Tasks:
  #130 - PostgreSQL セキュリティパッチ適用のためのデータベースアップグレード (NEW)
  #129 - notificationsテーブルのnotification_scheduledカラム冗長性解決 (NEW)
  #119 - 構造化ログへの統一: String(error)パターンを置き換え

✅ RECENTLY COMPLETED:
  #125 - 日時ライブラリ導入によるタイムゾーン処理の改善
  #126 - 通知スケジュール管理の不整合とカラム名改善

📈 RECOMMENDED NEXT: Start with #130 (PostgreSQL security patch) - security priority
```

#### When no roadmap (fallback):

```
📋 Open GitHub Issues:

🔴 CRITICAL PRIORITY:
  #15 - Fix authentication bug (priority/critical)
  #23 - Security vulnerability in API (priority/critical)

🟠 HIGH PRIORITY:  
  #31 - Implement user dashboard (priority/high)
  #42 - Add email notifications (priority/high)

🐛 BUGS:
  #18 - Login page not responsive (bug)
  #26 - Database connection timeout (bug)

✨ ENHANCEMENTS:
  #12 - Dark mode support (enhancement)
  #35 - Export functionality (enhancement)

📈 RECOMMENDED NEXT: #15 (critical bug - affects user access)
```
