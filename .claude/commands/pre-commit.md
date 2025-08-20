---
description: "Pre-commit workflow that performs Deno type checking, formatting, and appropriate change granularity splitting, generating commit commands following CLAUDE.md rules"
---

# Pre-commit Command

This command executes the following processes sequentially and generates commit commands:

1. Type check with `deno check`
2. If type errors exist, stop processing and present error files
3. Format code with `deno fmt`
4. Split changed files into appropriate granularity
5. Generate commit messages for each change
6. Output `git add` and `git commit` commands that users can copy-paste

## Execution Steps

### 1. Execute Type Check

```bash
deno check src/**/*.ts
```

**⚠️ When type errors exist:**

- Display list of files with errors
- Stop processing (do not execute fmt or commit processes)
- Prompt user to fix errors

### 2. Execute Code Formatting (only when type check succeeds)

```bash
deno fmt
```

### 3. Check Current Changes

```bash
git status
git diff --cached
git diff
```

### 4. Analyze and Split Changes into Appropriate Granularity

Split changed files based on the following criteria:

- Split by functional units
- Split by file types (config files, implementation files, test files, etc.)
- Group files with high relevance together

### 5. Generate Commit Messages

Generate messages following CLAUDE.md rules in the following format:

- **Good**: "add Ticket type definition"
- **Good**: "implement SupabaseTicketRepository save method"
- **Bad**: "implement everything for ticket management"

### 6. Output Commands for User Execution

**⚠️ IMPORTANT: Single-line format for copy-paste compatibility**

All `git add` commands MUST be formatted as single lines to prevent copy-paste errors in terminal:

```bash
# Change group 1: Add type definitions
git add src/domain/entities/NewType.ts src/domain/entities/index.ts
git commit -m "add NewType entity with validation rules"

# Change group 2: Add test files  
git add src/domain/entities/__tests__/NewType.test.ts
git commit -m "add unit tests for NewType entity"
```

**Format Rules:**

- Keep all file paths on the same line separated by spaces
- Never break `git add` commands across multiple lines
- Use single line even for many files: `git add file1.ts file2.ts file3.ts file4.ts`

## Notes

- Stop processing immediately when type check errors exist
- Claude has no commit permissions, so all commands must be copy-pasted by user
- Split with appropriate granularity following CLAUDE.md commit granularity
- Generate commit messages in Japanese (when needed)
- **CRITICAL**: Format all `git add` commands as single lines to prevent terminal copy-paste errors
