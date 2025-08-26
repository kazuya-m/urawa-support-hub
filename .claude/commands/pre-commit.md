---
description: 'Pre-commit workflow that performs Deno type checking, formatting, and appropriate change granularity splitting, generating commit commands following CLAUDE.md rules'
---

# Pre-commit Command

This command executes the following processes sequentially and generates commit commands:

1. **Security check** - Verify no sensitive data or security risks exist
2. Type check with `deno check`
3. If security violations or type errors exist, stop processing and present issues
4. Format code with `deno fmt`
5. Split changed files into appropriate granularity
6. Generate commit messages for each change
7. Output `git add` and `git commit` commands that users can copy-paste
8. **Update project roadmap** - Update issue status in docs/issue-priority-roadmap.md if exists

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

### 7. Output Commands for User Execution

**⚠️ CRITICAL: Single-line format for copy-paste compatibility**

All `git add` commands MUST be formatted as single lines to prevent copy-paste errors in terminal:

```bash
# Change group 1: Add type definitions
git add src/domain/entities/NewType.ts src/domain/entities/index.ts
git commit -m "add NewType entity with validation rules"

# Change group 2: Add test files  
git add src/domain/entities/__tests__/NewType.test.ts
git commit -m "add unit tests for NewType entity"
```

**⚠️ CRITICAL Format Rules:**

- **Single line requirement**: Keep all file paths on the same line separated by spaces
- **Line break prohibition**: Never break `git add` commands across multiple lines
- **Multiple files**: Use single line even for many files:
  `git add file1.ts file2.ts file3.ts file4.ts`
- **Copy-paste safety**: Line breaks in `git add` commands cause terminal execution failures

**Example of INCORRECT formatting (will fail):**

```bash
# ❌ This WILL FAIL when copy-pasted to terminal
git add docs/security/environment-variable-management.md \
       docs/security/gcp-service-account-permissions.md \
       docs/security/supabase-rls-settings.md
```

**Example of CORRECT formatting:**

```bash
# ✅ This is safe for copy-paste
git add docs/security/environment-variable-management.md docs/security/gcp-service-account-permissions.md docs/security/supabase-rls-settings.md
```

### 8. Update Project Roadmap (Final Step)

**⚠️ CRITICAL: Execute only AFTER all commits are ready**

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

**Example Status Updates:**

```bash
# If implementing repository factory (#37):
# Change: #37 | Supabase client and repositories | ⏳ IN PROGRESS → ✅ COMPLETED

# If starting new cloud services work (#24):
# Change: #24 | Google Cloud Run scraping service | ❌ Not Started → ⏳ IN PROGRESS
```

**Roadmap Update Commands:**

```bash
# After roadmap updates, add to the commit sequence:
git add docs/issue-priority-roadmap.md
git commit -m "プロジェクトロードマップを更新：課題 #XX の進捗を反映"
```

## Notes

- **Security Priority**: 🛡️ Stop processing immediately when security violations exist
- Stop processing immediately when type check errors exist
- Claude has no commit permissions, so all commands must be copy-pasted by user
- Split with appropriate granularity following CLAUDE.md commit granularity
- Generate commit messages in Japanese (when needed)
- **CRITICAL**: Format all `git add` commands as single lines to prevent terminal copy-paste errors
- **Line break failure**: Multi-line `git add` commands with line breaks will fail when copy-pasted
  to terminal
