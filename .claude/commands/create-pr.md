---
description: 'Custom command to create GitHub Pull Requests following CLAUDE.md rules. Supports Japanese titles, automatic issue linking, and proper PR creation with test plans'
---

# Create GitHub Pull Request Command

Custom slash command to create GitHub pull requests following CLAUDE.md conventions for proper PR
creation.

## Execution Steps

### 1. Check Current Status

```bash
git status
git diff
git log --oneline -10
```

### 2. Check Branch and Remote Status

```bash
git branch -a
git remote -v
```

### 3. Analyze Changes

Check differences between current branch and `main`:

```bash
git diff main...HEAD
```

### 4. Create Pull Request

Create PR with the following command:

```bash
gh pr create --title "<Japanese-title> #<issue-number>" --body "$(cat <<'EOF'
## 概要

- Implementation overview

## 実装内容

- Detailed changes
- Implemented features or fixed issues

## テスト計画

- [ ] Execution verified
- [ ] Type check verified
- [ ] Lint check verified

Closes #<issue-number>
EOF
)"
```

## PR Creation Requirements

### 🎯 Mandatory Requirements (CLAUDE.md Compliance)

#### Title Requirements

- **Language**: Use Japanese
- **Format**: `<implementation-content> #<issue-number>`
- **Example**: `pre-commitフック実装（Denoネイティブ）#6`

#### Description Requirements

- **Language**: Write in Japanese
- **Auto-close**: Must include `Closes #<issue-number>`
- **Alternative keywords**: `Fixes #<issue-number>`, `Resolves #<issue-number>` also available

#### Description Structure

```markdown
## 概要

- Implementation overview

## 実装内容

- Detailed changes

## テスト計画

- Checklist of verified items

Closes #<issue-number>
```

**important** Do NOT include "Generate With Claude"

### 🔍 Pre-check Items

1. **Working Tree Status Check**
   - Committed changes exist
   - No uncommitted changes

2. **Branch Naming Convention Check**
   - `feature/#<issue-number>_<description>`
   - `fix/#<issue-number>_<description>`

3. **Security Check** 🛡️
   - No API keys, tokens, or secrets in code
   - No hardcoded passwords or credentials
   - No sensitive configuration data exposed
   - Environment variables properly used for sensitive data
   - Database connection strings not exposed

4. **Remote Branch Status Check**
   - Branch exists on remote (user should push if needed)
   - Latest changes are available for PR creation

### 📝 Post-PR Creation Check

1. **GitHub Verification**
   - Confirm PR creation
   - Verify automatic issue linking
   - Set labels and reviewers

2. **Get PR URL**
   - Retrieve created PR URL and present to user

## Usage Examples

### Basic Usage

```bash
# Current branch: feature/#21_update-architecture-docs
# Target issue: #21

gh pr create --title "アーキテクチャドキュメント更新とスラッシュコマンド追加 #21" --body "..."
```

### Error Handling

- **Uncommitted changes exist**: Display message prompting commit
- **Remote branch doesn't exist**: Inform user to push branch first
- **GitHub authentication error**: Prompt `gh auth login`
- **Security violations found**: Refuse PR creation and inform about security risks

## Notes

- **Commit permissions**: Claude cannot commit directly, all git commands must be copy-pasted by
  user
- **Issue numbers**: Specify appropriate issue numbers
- **CLAUDE.md compliance**: Follow all PR creation requirements
- **Japanese usage**: Write titles and descriptions in Japanese
- **Security Priority**: 🛡️ Security takes precedence - refuse PR creation if any security risks are
  detected
