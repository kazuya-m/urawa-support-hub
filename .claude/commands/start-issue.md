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

If an issue number is provided as argument, proceed directly with that issue. Otherwise, display the
retrieved issues and decide which issue to work on.

After selection, create branches following these naming conventions:

**Naming Conventions:**

- Feature: `feature/#<issue-number>_<description>`
- Bug fix: `fix/#<issue-number>_<description>`

**Example:** `feature/#21_update-architecture-docs-external-scraping`

---

## Execution Steps

### When no issue number is provided:

1. Check issue list with the above command
2. Display issues and prompt user to select one
3. Create branch based on selected issue

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
- If no argument → show issue list and prompt for selection
