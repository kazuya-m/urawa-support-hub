---
description: "Retrieve open GitHub issues list, create feature/fix branches following CLAUDE.md naming conventions based on selected issue, and start new development tasks"
---

# Start New Task from GitHub Issue

Select a task to work on from GitHub issues and create branches with proper naming conventions.

First, retrieve the list of currently open GitHub issues:

```bash
gh issue list --state open --limit 15 --json number,title,labels --format json
```

Display the retrieved issues and decide which issue to work on.

After selection, create branches following these naming conventions:

**Naming Conventions:**

- Feature: `feature/#<issue-number>_<description>`
- Bug fix: `fix/#<issue-number>_<description>`

**Example:** `feature/#21_update-architecture-docs-external-scraping`

Once you select an issue, please provide the issue number. I will generate the appropriate branch
name and create and checkout the branch.

Selected issue number: **{awaiting input}**

---

## Execution Steps

1. Check issue list with the above command
2. Select the issue number you want to work on
3. Create branch with the following command:

```bash
# Generate branch name based on selected issue
# Example: for issue #22
git checkout -b "feature/#22_implement-external-scraping-environment"
```

4. Start working after branch creation is complete

**Important:** Following CLAUDE.md's "🚨 CRITICAL: Always create a new branch before starting
implementation", always create a new branch from the main branch.
