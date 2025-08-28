---
description: 'Pre-commit workflow that performs Deno type checking, formatting, and appropriate change granularity splitting, generating commit commands following CLAUDE.md rules'
---

# Pre-commit Command

This command executes the following processes sequentially and generates commit commands:

1. **Security check** - Verify no sensitive data or security risks exist
2. Type check with `deno check`
3. If security violations or type errors exist, stop processing and present issues
4. Format code with `deno fmt`
5. Check current changes with `git status`
6. Analyze and split changed files into appropriate granularity
7. Generate commit messages for each change
8. Update project roadmap if applicable
9. **Output executable script file** - Generate `commit-commands.sh` with all git commands

## Execution Steps

### 1. Security Check 🛡️

**⚠️ CRITICAL: Execute security check before any processing**

Check for security vulnerabilities in changed files:

- No API keys, tokens, or secrets in code
- No hardcoded passwords or credentials
- No sensitive configuration data exposed
- Environment variables properly used for sensitive data
- Database connection strings not exposed
- No malicious code patterns

**When security violations found:**

- **REFUSE** to proceed with commit process
- Display security risk details
- Stop all processing immediately

### 2. Execute Type Check

```bash
deno check src/**/*.ts
```

**⚠️ When type errors exist:**

- Display list of files with errors
- Stop processing (do not execute fmt or commit processes)
- Prompt user to fix errors

### 3. Execute Code Formatting (only when security and type checks succeed)

```bash
deno fmt
```

### 4. Check Current Changes

```bash
git status
git diff --cached
git diff
```

### 5. Analyze and Split Changes into Appropriate Granularity

Split changed files based on the following criteria:

- Split by functional units
- Split by file types (config files, implementation files, test files, etc.)
- Group files with high relevance together

### 6. Generate Commit Messages

Generate messages following CLAUDE.md rules in the following format:

- **Good**: "add Ticket type definition"
- **Good**: "implement SupabaseTicketRepository save method"
- **Bad**: "implement everything for ticket management"

**⚠️ CRITICAL: Commit Message Format**

**DO NOT include "Generated with Claude Code" footer or Co-Authored-By lines**

Use simple, clean commit messages without any meta-information:

```bash
# ✅ Correct format
git commit -m "add notification service configuration"

# ❌ Do NOT include these lines
git commit -m "add notification service configuration

🌐 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 7. Update Project Roadmap (if applicable)

If `docs/issue-priority-roadmap.md` exists, update issue statuses based on the commits being made:

**Update Process:**

1. **Check roadmap existence**: Verify `docs/issue-priority-roadmap.md` exists
2. **Analyze commit contents**: Identify which issues are being addressed in the commits
3. **Update statuses**: Change issue statuses in the roadmap:
   - **Features completed**: ❌ Not Started → ✅ **COMPLETED**
   - **Features started**: ❌ Not Started → ⏳ **IN PROGRESS**
   - **Partial progress**: Keep ⏳ **IN PROGRESS** if work continues
4. **Update progress counters**: Recalculate completion percentages
5. **Update dates**: Refresh "Updated" timestamp to current date
6. **Next steps**: Reorder "Next Steps Priority" based on new status

### 8. Output Commands for User Execution (Final Step)

**🚨 CRITICAL: Generate executable script file for all git commands**

Create a temporary shell script file `commit-commands.sh` that contains all the git add and git
commit commands in appropriate granularity:

**Script File Format:**

```bash
#!/bin/bash

# Auto-generated commit commands
# Generated at: [timestamp]
# Issue: #[issue-number]

echo "📦 Starting commits for Issue #XX..."

# Group 1: [Description]
git add file1.ts file2.ts
git commit -m "commit message here"
echo "✅ Group 1 committed"

# Group 2: [Description]
git add file3.ts file4.ts
git commit -m "another commit message"
echo "✅ Group 2 committed"

# Roadmap update (if applicable)
git add docs/issue-priority-roadmap.md
git commit -m "プロジェクトロードマップを更新：課題 #XX の進捗を反映"
echo "✅ Roadmap updated"

echo "🎉 All commits completed!"
```

**⚠️ CRITICAL Format Rules:**

- **Single line requirement**: Keep all file paths on the same line separated by spaces
- **Line break prohibition**: Never break `git add` commands across multiple lines
- **Script execution**: User can run with `bash commit-commands.sh` or
  `chmod +x commit-commands.sh && ./commit-commands.sh`
- **Progress feedback**: Include echo statements to show progress
- **Error handling**: Script will stop on first error (bash default behavior)

**Example of CORRECT formatting:**

```bash
# ✅ This is safe for copy-paste and script execution
git add docs/security/environment-variable-management.md docs/security/gcp-service-account-permissions.md docs/security/supabase-rls-settings.md
```

**Example of INCORRECT formatting (will fail):**

```bash
# ❌ This WILL FAIL when executed
git add docs/security/environment-variable-management.md \
       docs/security/gcp-service-account-permissions.md \
       docs/security/supabase-rls-settings.md
```

## Notes

- **Security Priority**: 🛡️ Stop processing immediately when security violations exist
- Stop processing immediately when type check errors exist
- Claude has no commit permissions, so all commands must be copy-pasted by user
- Split with appropriate granularity following CLAUDE.md commit granularity
- Generate commit messages in Japanese (when needed)
- **CRITICAL**: Always generate `commit-commands.sh` script file for batch execution
- **CRITICAL**: Format all `git add` commands as single lines to prevent terminal copy-paste errors
- **Line break failure**: Multi-line `git add` commands with line breaks will fail when executed
- **Script execution**: User can run the generated script with `bash commit-commands.sh`
