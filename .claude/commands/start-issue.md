---
description: 'Retrieve open GitHub issues list, create feature/fix branches following CLAUDE.md naming conventions based on selected issue, and start new development tasks'
arguments:
  - name: issue_number
    description: 'GitHub issue number to start working on'
    required: false
---

# Start New Task from GitHub Issue

Select a task to work on from GitHub issues and create branches with proper naming conventions.

## Usage

- `/start-issue` - Show all open issues and prompt for selection
- `/start-issue <number>` - Directly start working on the specified issue number

First, retrieve the list of currently open GitHub issues:

```bash
gh issue list --state open --limit 15 --json number,title,labels --format json
```

If an issue number is provided as argument, proceed directly with that issue. Otherwise:

1. Check if docs/issue-priority-roadmap.md exists for priority context
2. Display issues with available priority information:
   - If roadmap exists: Show roadmap-based priorities and phase information
   - If no roadmap: Show issues with label-based priority (priority/high, priority/critical, etc.)
3. Present recommended next issues based on available information

After selection, create branches following these naming conventions:

**Naming Conventions:**

- Feature: `feature/#<issue-number>_<description>`
- Bug fix: `fix/#<issue-number>_<description>`

**Example:** `feature/#21_update-architecture-docs-external-scraping`

---

## Execution Steps

### When no issue number is provided:

1. Check issue list with the above command
2. Check if docs/issue-priority-roadmap.md exists
3. Display issues with priority context:

   **If roadmap exists:**
   - 🔴 Critical (Phase-based priorities from roadmap)
   - 🟠 High (Phase-based priorities)
   - 📋 Next Steps priority order from roadmap
   - Show completion status and blockers from roadmap

   **If no roadmap (fallback):**
   - Show issues grouped by GitHub labels (priority/critical, priority/high, bug, enhancement)
   - Sort by creation date (newest first) within each priority group
   - Highlight issues with recent activity

4. Recommend next issues based on available information
5. Prompt user to select one or suggest most urgent task
6. Create branch based on selected issue

### When issue number is provided as argument:

1. Fetch the specific issue details
2. Create branch directly based on the issue

### Branch Creation:

```bash
# Generate branch name based on selected issue
# Example: for issue #22
git checkout -b "feature/#22_implement-external-scraping-environment"
```

**Important:** Following CLAUDE.md's "🚨 CRITICAL: Always create a new branch before starting
implementation", always create a new branch from the main branch.

### Logic Flow:

- If `issue_number` argument provided → fetch that specific issue and create branch
- If no argument → show prioritized issue list with available context and recommend next steps

### Sample Output Examples:

#### When roadmap exists:

```
📋 Current Development Status (based on issue-priority-roadmap.md):

🔴 CRITICAL - Next Priority Tasks:
  #28 - Google Cloud Platform project and account setup (BLOCKER)
  #29 - LINE Bot and Discord Webhook external service setup (BLOCKER)  
  #17 - Environment variables and basic secrets setup

✅ COMPLETED (5/16 - 31%):
  #36, #37, #40, #33, local scraping

📈 RECOMMENDED NEXT: Start with #28 (GCP setup) - required for cloud services
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
