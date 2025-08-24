---
description: 'このブランチでの全ての変更（コミット済み + ワーキングディレクトリ変更）を包括的にレビューするコマンド。ブランチで実装・作業中の内容に集中してセキュリティ、アーキテクチャ、パフォーマンス、保守性、コード品質、GitHub Issue対応状況を分析'
---

# Comprehensive Branch Review Command

This command performs a thorough multi-perspective review of **all changes in the current branch**
(both committed changes and working directory modifications). It follows the principles defined in
CLAUDE.md and focuses on everything that has been implemented or is being worked on in this branch.

## Review Perspectives

### 1. 🛡️ Security Review (CRITICAL - FIRST PRIORITY)

- **Minimum Privilege Principle**: Check if permissions follow least privilege
- **Secrets Management**: No hardcoded credentials, proper environment variable usage
- **Data Access Control**: RLS policies, authentication, authorization
- **Input Validation**: SQL injection, XSS prevention
- **Error Handling**: No sensitive information leakage in error messages
- **Dependency Security**: Check for known vulnerabilities

### 2. 🏗️ Architecture & Design Review

- **Clean Architecture**: Proper layer separation (Domain, Application, Infrastructure)
- **SOLID Principles**: Single responsibility, dependency inversion
- **Design Patterns**: Repository pattern, dependency injection consistency
- **API Design**: RESTful conventions, consistent error responses
- **Database Design**: Normalization, indexing, constraints
- **Configuration Management**: Externalized configuration, environment-specific settings

### 3. 📊 Performance Review

- **Database Queries**: N+1 queries, proper indexing, query optimization
- **Memory Usage**: Object lifecycle, garbage collection considerations
- **Network Calls**: Batching, caching, connection pooling
- **Resource Constraints**: Cloud Run memory limits, Edge Functions timeout
- **Scalability**: Load handling, bottleneck identification

### 4. 🔧 Code Quality Review

- **Type Safety**: Proper TypeScript usage, no `any` types
- **Error Handling**: Comprehensive error scenarios, proper error types
- **Testing**: Unit test coverage, integration tests, test quality
- **Code Readability**: Clear naming, proper comments, self-documenting code
- **Code Duplication**: DRY principle, reusable utilities

### 5. 🔄 Maintainability Review

- **Documentation**: README updates, API documentation, inline comments
- **Dependency Management**: Version pinning, dependency updates
- **Deployment**: CI/CD pipeline, environment setup
- **Monitoring**: Logging, error tracking, performance metrics
- **Backward Compatibility**: API versioning, migration strategies

### 6. 📋 GitHub Issue Compliance Review

- **Issue Requirements**: Check if changes satisfy issue completion criteria
- **Implementation Scope**: Verify features defined in issue are properly implemented
- **Additional Changes**: Validate any changes beyond issue scope
- **Issue Closure Readiness**: Assess if issue can be closed after PR merge
- **Related Issues**: Impact on other dependent or related issues

## Execution Steps

### Step 1: Complete Branch Analysis

```bash
# Get current branch and all changes from main
git branch --show-current
git status                        # Current working state

# All files that differ from main (committed + working directory)
git diff main --name-only         # All changed files from main
git diff main --stat              # Change statistics

# Separate committed vs working directory changes for context
git diff main...HEAD --name-only  # Committed changes only
git diff --name-only              # Unstaged changes
git diff --cached --name-only     # Staged changes

# Branch context
git log main..HEAD --oneline      # Commits in current branch
```

### Step 1.1: Comprehensive Change Identification

Identify all changes in this branch:

- **Committed Changes**: Files modified/added in branch commits
- **Staged Changes**: Ready for commit but not yet committed
- **Working Directory Changes**: Current modifications being worked on
- **New Files**: Files added in this branch (committed or untracked)

**Review Scope**: Analyze ALL changes that represent the work done in this branch

### Step 2: Comprehensive File Analysis

For each file that differs from main (committed + working directory + new files), analyze:

- **File Purpose**: Role and responsibility in the system
- **All Branch Changes**: What was modified/added in this branch (committed + working)
- **Change Impact**: How all changes affect existing functionality
- **Architecture Compliance**: Adherence to project architecture patterns
- **Security Implications**: Security considerations for all branch work
- **Performance Impact**: Performance effects of all branch modifications

**Analysis Scope**: Review ALL files that represent work done in this branch, regardless of commit
status

### Step 3: Multi-Perspective Review

#### 🛡️ Security Analysis (All Branch Changes)

Check all files that differ from main for security issues:

```bash
# Get list of all files changed in this branch (committed + working + new)
ALL_BRANCH_FILES=$(git diff main --name-only; git ls-files --others --exclude-standard)

# Check all branch-related files for security issues
echo "$ALL_BRANCH_FILES" | sort | uniq | xargs grep -l "password\|secret\|key\|token" 2>/dev/null || true
echo "$ALL_BRANCH_FILES" | sort | uniq | xargs grep -l "console.log\|console.error" 2>/dev/null || true

# Also check untracked files in the branch
git ls-files --others --exclude-standard | xargs grep -l "password\|secret\|key\|token" 2>/dev/null || true
```

Verify:

- No hardcoded credentials
- Proper environment variable usage
- Input validation implementation
- Error message safety
- Authentication/authorization implementation

#### 🏗️ Architecture Analysis

Verify:

- Layer separation (Domain/Application/Infrastructure)
- Dependency flow (dependencies point inward)
- Interface/implementation separation
- Configuration externalization
- Service boundaries

#### 📊 Performance Analysis

Check for:

- Database query patterns
- Memory usage patterns
- Network call optimization
- Resource usage within constraints
- Caching strategies

#### 🔧 Quality Analysis (All Branch Changes)

```bash
# Type checking (all files, but focus on branch changes in output analysis)
deno check src/**/*.ts

# Linting (all files, but focus on branch changes in output analysis)  
deno lint

# Test coverage for all TypeScript changes in branch
ALL_BRANCH_TS_FILES=$(git diff main --name-only; git ls-files --others --exclude-standard | grep '\.ts$' || true)
if [ -n "$ALL_BRANCH_TS_FILES" ]; then
  deno test --coverage
fi
```

**Analysis Priority**: Focus quality analysis on all TypeScript files that differ from main
(committed + working + new)

#### 🔄 Maintainability Analysis

Check:

- Documentation updates
- Test additions/updates
- Dependency changes
- Breaking change considerations

### Step 4: Review Report Generation

Generate a comprehensive review report:

## Review Report Format

**Important**: Always output the review report in Japanese for user readability.

```markdown
# 📋 包括的レビューレポート

## 📊 概要

- **ブランチ**: [ブランチ名]
- **ブランチでの全変更ファイル数**: [コミット済み + ワーキング + 新規ファイル件数]
- **コミット済み変更**: [コミット済みファイル数]
- **ワーキングディレクトリ変更**: [未コミット変更件数]
- **新規ファイル**: [追跡外ファイル数]
- **レビュー日**: [日付]
- **対象GitHub Issue**: #[番号] [タイトル]
- **総合ステータス**: ✅ 承認 / ⚠️ 要注意 / ❌ 却下
- **レビュー対象**: このブランチでの全ての変更

## 📋 GitHub Issue対応状況

### ✅ 要件充足

- [Issueの完了条件を満たしている項目]

### ⚠️ 未完了要件

- [まだ満たしていないIssue要件]

### 📝 追加実装

- [Issue範囲外の追加変更とその妥当性]

## 🛡️ セキュリティレビュー

### ✅ 適切な実装

- [正しく実装されたセキュリティ対策]

### ⚠️ 懸念事項

- [潜在的なセキュリティ問題]

### ❌ 重大な問題

- [修正必須のセキュリティ違反]

## 🏗️ アーキテクチャレビュー

### ✅ 優れた設計

- [良好なアーキテクチャ決定]

### ⚠️ 改善提案

- [アーキテクチャ改善点]

### ❌ 設計違反

- [アーキテクチャ原則違反]

## 📊 パフォーマンスレビュー

### ✅ 最適化

- [パフォーマンス向上点]

### ⚠️ 潜在的問題

- [パフォーマンス懸念事項]

## 🔧 コード品質レビュー

### ✅ 品質の高い実装

- [良好なコード実践]

### ⚠️ 改善が必要

- [コード品質問題]

## 🔄 保守性レビュー

### ✅ 保守性向上

- [保守性改善点]

### ⚠️ ドキュメント不足

- [不足しているドキュメント]

## 🎯 アクションアイテム

### 🔥 重要（修正必須）

- [ ] [重要なセキュリティ・アーキテクチャ問題]

### ⚠️ 重要（修正推奨）

- [ ] [パフォーマンス・品質問題]

### 💡 提案（検討）

- [ ] [あると良い改善点]

## 📈 推奨事項

1. **セキュリティ**: [セキュリティ推奨事項]
2. **アーキテクチャ**: [アーキテクチャ推奨事項]
3. **パフォーマンス**: [パフォーマンス推奨事項]
4. **品質**: [品質推奨事項]
5. **保守性**: [保守性推奨事項]
6. **Issue対応**: [Issue完了のための推奨事項]

## ✅ 承認基準

- [ ] 重大なセキュリティ問題なし
- [ ] Clean Architectureの原則に従っている
- [ ] パフォーマンスの劣化なし
- [ ] コード品質基準を満たしている
- [ ] 十分なテストカバレッジ
- [ ] ドキュメント更新済み
- [ ] GitHub Issue要件を満たしている
```

## Review Rules

### 🚨 Auto-Reject Conditions

- Critical security vulnerabilities
- Hardcoded credentials or secrets
- Architecture violations (wrong dependency direction)
- Type errors or compilation failures
- Missing tests for critical functionality

### ⚠️ Needs Attention Conditions

- Performance concerns
- Code quality issues
- Missing documentation
- Potential security improvements
- Maintainability concerns

### ✅ Auto-Approve Conditions

- All security checks pass
- Architecture compliance
- Good test coverage
- Clear documentation
- Performance within acceptable limits

## Integration with CLAUDE.md

This review command follows all principles from CLAUDE.md:

- **Minimum privilege principle** for security
- **Clean Architecture patterns** for design
- **Test-driven development** for quality
- **Configuration-driven design** for maintainability
- **Multi-language documentation** consistency

## Usage Examples

```bash
# Full comprehensive review of branch commits only
/review-changes

# Review branch changes with focus on committed files
/review-changes --branch-only

# Review specific committed files from branch
/review-changes docs/security/

# Review with detailed output for branch changes
/review-changes --verbose
```

## Notes

- **Complete Branch Focus**: Review ALL changes in this branch (committed + working directory + new
  files)
- **Priority Order**: Security → Architecture → Performance → Quality → Maintainability
- **Fail Fast**: Stop on critical security or architecture issues in any branch changes
- **Actionable Output**: Provide specific, actionable recommendations for all branch work
- **CLAUDE.md Compliance**: All recommendations must align with project principles
- **Multi-language**: Consider both English and Japanese documentation consistency
- **Comprehensive Scope**: Analyze all work done in this branch regardless of commit status
