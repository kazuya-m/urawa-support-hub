# urawa-support-hub Claude Code Development Guide

**🌐 Language Versions**:

- **English**: This document (CLAUDE.md)
- **日本語**: CLAUDE_ja.md

## Role (Claude's Role)

- Act as a software engineering expert
- Analyze with critical and constructive perspective, not seeking affirmation
- If understanding is not 100%, ask questions to deepen understanding rather than proceeding with
  implementation
- When understanding is not 100%, explain implementation content along with current understanding
  level

## Project Overview

Automated notification system for Urawa Red Diamonds away match ticket sales information targeting
supporters

**🗺️ IMPORTANT**: For issue prioritization and implementation roadmap, always refer to:

- **docs/issue-priority-roadmap.md** - Complete phase-based development plan with deadlines
- Phases: Foundation → Core → Notification → Integration → Post-Launch Improvements
- MVP Launch target: 2025-09-30

## Development Workflow

### Branch Strategy

- `main`: Stable branch for production environment
- `feature/*`: Feature development branch (e.g., `feature/implement-ticket-repository`)
- `fix/*`: Bug fix branch

### Commit Granularity and Branch Management

**🚨 CRITICAL**: Always create a new branch before starting implementation

**Branch Creation Requirements**:

- **MANDATORY**: Create branch with issue number: `feature/#<issue-number>_<description>`
- **Example**: `feature/#6_add-pre-commit-hooks`
- **Never implement directly on `main` branch**

**Important**: Create branches appropriately per feature and commit in small units

#### Recommended Patterns:

1. **Feature Implementation**: Create new branch for each feature
   ```bash
   git checkout -b feature/implement-basic-types
   # Implement type definitions
   git add . && git commit -m "add basic types for Ticket and NotificationHistory"

   git checkout -b feature/implement-ticket-repository
   # Implement repository
   git add . && git commit -m "implement TicketRepositoryImpl with internal dependency resolution"
   ```

2. **Commit Units**: One commit per logical change
   - ✅ Good: "add Ticket type definition"
   - ✅ Good: "implement TicketRepositoryImpl save method"
   - ❌ Bad: "implement everything for ticket management"

3. **Pull Requests**: Merge to main or develop after feature completion

### Current Implementation Phase

Phase 1: Foundation building and core feature implementation

### Implementation Phases

1. **Google Cloud Setup**: Configure Cloud Run, Scheduler, and Tasks
2. **Supabase Integration**: Database schema and Edge Functions setup
3. **Scraping Service**: Playwright-based ticket extraction in Cloud Run
4. **Notification System**: Event-driven notifications via Cloud Tasks
5. **Data Persistence**: RepositoryImpl classes with internal dependency resolution
6. **Error Handling**: Comprehensive monitoring with Discord alerts
7. **Testing Strategy**: Unit and integration tests with proper permissions
8. **Production Deployment**: Multi-stage deployment with monitoring

### Core Architecture

**🏗️ Hybrid Google Cloud + Supabase Architecture**

- **Scraping Execution**: Google Cloud Run (Playwright, 2GB memory, 300s timeout)
- **Daily Trigger**: Google Cloud Scheduler (12:00 JST)
- **Notification Scheduling**: Google Cloud Tasks (event-driven, exponential backoff)
- **Database**: Supabase PostgreSQL (primary data storage)
- **Notification Delivery**: Supabase Edge Functions (512MB memory, 60s timeout)
- **External Services**: LINE Messaging API + Discord Webhook

### Important Constraints

- **Cloud Run**: 2GB memory, 300 seconds timeout (for scraping)
- **Edge Functions**: 512MB memory, 60 seconds timeout (for notifications)
- **Cost**: Must operate within free tier limits
- **Reliability**: Event-driven architecture with built-in retry mechanisms

### Latest Design Documentation

**⚠️ IMPORTANT**: Always refer to the latest documentation before implementation:

- **docs/system-architecture.md** - Complete system architecture and design patterns
- **docs/implementation-guide.md** - Detailed technical implementation with code examples
- **docs/tech-selection.md** - Technology selection rationale and alternatives
- **docs/requirements.md** - Functional and non-functional requirements
- **docs/setup-guide.md** - Environment setup and deployment guide

### 📚 Documentation Reference Guide

**🎯 Context-Specific Documentation Usage**:

- **設計・アーキテクチャ検討時**: `docs/system-architecture.md` - Clean
  Architecture層構造、依存関係原則、GCP+Supabase構成
- **実装パターン参照時**: `docs/implementation-guide.md` -
  UseCase/Service/Repository実装例、内部依存解決原則
- **技術選択・制約確認時**: `docs/tech-selection.md` - GCP+Supabase構成rationale、制約事項
- **セキュリティ実装時**: `docs/security/` - 認証・権限・RLS設定、環境変数管理
- **テスト戦略策定時**: `docs/clean-architecture-guide.md` - 小規模プロジェクト向けテスト、Module
  Mock戦略、Permission設定
- **環境構築・デプロイ時**: `docs/setup-guide.md` - 環境セットアップ、デプロイ手順

**📋 読み方の原則**:

- **実装前**: 該当するcontext documentを必ず参照
- **判断に迷った時**: 複数documentを横断参照
- **新規機能時**: system-architecture.md → implementation-guide.md の順で参照

### Documentation Language Management

**🌐 Multi-language Documentation Policy**:

- **Primary Language**: English (docs/*.md)
- **Secondary Language**: Japanese (docs/ja/*.md)
- **Update Order**: Always update English first, then Japanese follows
- **Consistency Rule**: Japanese version must always track English version
- **Reference Priority**: Use English docs as the source of truth for implementation

**Important**: When creating or updating documentation:

1. Create/update English version first
2. Immediately create/update corresponding Japanese version
3. Ensure content consistency between languages
4. Reference English docs in CLAUDE.md instructions

### Documentation Creation Principles

**📚 CRITICAL: Documentation as Master Source**

Documentation serves as the single source of truth for implementation and operation, not as
implementation history or migration guides.

**🎯 Documentation Purpose**:

- **Master reference**: Definitive implementation guide for current state
- **Operational knowledge**: How systems work and how to use them
- **Technical specification**: APIs, configurations, and patterns

**❌ What NOT to include**:

- Implementation process descriptions ("Phase 1: First we did...", "Migration steps")
- Historical context or "how we got here" narratives
- Temporary workarounds or migration-specific content
- Development timeline or project management information

**✅ What TO include**:

- Current implementation patterns and examples
- Configuration requirements and formats
- API specifications and usage examples
- Troubleshooting and operational procedures
- Security requirements and best practices

**Example Structure**:

```markdown
# Service Name

## Configuration

[Current config format]

## Usage

[How to use the service]

## API Reference

[Current API patterns]

## Security

[Current security requirements]
```

**🚨 Key Rule**: Write documentation as if the reader needs to understand and use the current
system, not learn about its development history.

## Development Notes

- Always investigate J-League ticket site structure before implementation
- Implement error handling for each feature
- Record appropriate debug information in log output
- Practice test-driven development
- **Code Formatting**: Always use `deno fmt` for consistent code formatting across all TypeScript
  and Markdown files

## Required Development Process

### 🚨 Always perform operation verification and test execution after implementation

#### 1. Operation Verification Steps

- **TypeScript type check**: Confirm no compilation errors with `deno check`
- **Lint check**: Confirm code quality with `deno lint`
- **Local environment execution test**: Confirm implemented features work as expected
- **Database integration verification**: Confirm Supabase connection and CRUD operations
- **Constraint/validation verification**: Confirm database constraints and type checking work
  properly
- **Error handling verification**: Confirm errors are handled appropriately in exceptional cases

#### 2. Test Implementation Requirements

##### Unit Test File Placement Rules

- **Placement**: Create `__tests__` directory at the same level as target file and place test files
  inside
- **File naming**: Name in format `targetFileName.test.ts`
- **Example**: `src/features/repositories/TicketRepository.ts` →
  `src/features/repositories/__tests__/TicketRepository.test.ts`

##### Test Implementation Requirements

**🚨 重要原則**: 単体テストでは必ず依存関係をモック化すること

- **Unit test creation**: Tests to verify individual function/method behavior (in `__tests__/`
  directory at same level as target file)
- **適切なモック化**: 各層で依存する下位層を必ずモック化
  - **UseCase Test**: Infrastructure層（Service, Repository）をモック
  - **Controller Test**: Application層（UseCase）をモック
  - **Service Test**: Repository層と外部APIをモック
- **Integration test script creation**: Executable tests to verify key functionality
  (`tests/integration/`)
- **Testing with actual data**: Use test data that matches actual constraints rather than dummy data
- **Boundary value testing**: Verify behavior in normal, exceptional, and boundary value cases
- **Mock testing**: Unit tests with mocked external dependencies
- **Cleanup processing**: Complete tests including data deletion after testing
- **Test result verification**: Confirm all test cases succeed

**詳細**: docs/clean-architecture-guide.md の Testing Strategy を参照

#### 3. Pre-commit Checklist

- [ ] `deno check` type check success confirmed
- [ ] `deno lint` lint check success confirmed
- [ ] **Unit tests created** (in `__tests__/` directory at same level as target file)
- [ ] **Integration tests created** (tests/integration/)
- [ ] `deno test --allow-env` all tests success confirmed
- [ ] Operation verification test executed
- [ ] Error cases and boundary value tests executed
- [ ] Test data cleanup confirmed

**Important**: Commits/PRs without operation verification are prohibited. Always proceed to next
step after passing tests.

## Design Principles and Best Practices

### 🎯 Mandatory Compliance Items

#### 0. Small-Scale Project Design Principles

**🚨 CRITICAL: Always follow documented design patterns in docs/ directory**

- Refer to **docs/system-architecture.md** and **docs/implementation-guide.md** for design decisions
- Follow **docs/clean-architecture-guide.md** for testing strategies and patterns
- Maintain consistency between documented patterns and actual implementation

#### 1. Technology Selection and Consistency Principles

**🎯 Project Technology Stack Priority**:

- **Primary consideration**: Follow the hybrid Google Cloud + Supabase architecture
- **Cloud Run**: Use for resource-intensive Playwright scraping operations
- **Edge Functions**: Use for lightweight notification delivery
- **External dependencies**: Minimize dependencies; prioritize architecture consistency

**🎯 Problem-solving Approach**:

- **Requirements-based**: Start with "what needs to be achieved" rather than "which tool to use"
- **Project context**: Understand project philosophy and constraints before proposing solutions
- **Avoid tool fixation**: Don't default to popular tools; find project-optimal solutions

**Architecture Examples**:

```typescript
// ✅ Good: Cloud Run for heavy operations
export class PlaywrightScrapingService {
  // Runs in Cloud Run with 2GB memory
}

// ✅ Good: Edge Functions for lightweight tasks
export class LineNotificationService {
  // Runs in Edge Functions with 512MB memory
}

// ❌ Bad: Wrong service for task complexity
// Running Playwright in Edge Functions (memory limit)
```

#### 2. Naming Conventions

```typescript
// ✅ Good: Direct concrete class usage (small-scale project)
export class TicketRepositoryImpl {
  constructor() {
    this.client = createSupabaseAdminClient();
  }
}

// ❌ Bad: Interface-based abstraction (over-engineering)
export class TicketRepositoryImpl implements TicketRepository
```

#### 2. Unified Error Handling

```typescript
// ✅ Use common utilities
if (error) handleSupabaseError('save ticket', error);

// ❌ Duplicate code
if (error) throw new Error(`Failed to save ticket: ${error.message}`);
```

#### 3. Test Design

- **Separation**: Create individual test cases (prohibit giant integration tests)
- **Common utilities**: Utilize `createTestSupabaseClient()`, `cleanupTestData()`
- **Permissions**: `--allow-env --allow-net=127.0.0.1` (prohibit `--allow-all`)
- **Cloud Integration**: Test Cloud Run and Edge Functions separately
- **Mock Services**: Mock external Cloud services for unit tests

#### 4. Directory Structure

```
src/features/
├── shared/repositories/  # Interfaces
├── shared/utils/        # Common processing
└── {feature}/repositories/{Entity}RepositoryImpl.ts
```

### 🚨 Prohibited Items

- Including external service names in class names
- Duplicate error handling
- Using `--allow-all` permissions
- Giant integration tests

### 🎯 Next Session Check Items

- [ ] Use `{Entity}RepositoryImpl` direct concrete class naming
- [ ] Utilize common error handlers
- [ ] Set minimum permissions
- [ ] Confirm consistency with existing patterns

## GitHub Issue and Pull Request Management

### 🎯 Pull Request Creation Requirements

**Language Requirements**:

- **PR Title**: Use Japanese (`pre-commitフック実装（Denoネイティブ）#6`)
- **PR Description**: Write in Japanese for better team understanding
- **Include issue number**: Add `#<issue-number>` in title for GitHub integration

**Auto-close Requirements**:

- **Always include**: `Closes #<issue-number>` in PR description
- **Effect**: GitHub automatically closes linked issue when PR is merged
- **Alternative keywords**: `Fixes #<issue-number>`, `Resolves #<issue-number>`

**Example PR Format**:

```markdown
## 概要

- 実装内容の概要

## 実装内容

- 詳細な変更内容

Closes #6
```

## Configuration-Driven Design Pattern

### 🎯 NotificationConfig Externalization

Complete externalization of notification timing settings to handle value changes during operation

```typescript
// ✅ Configuration-driven: NotificationConfig.ts
export const NOTIFICATION_TIMING_CONFIG = {
  day_before: {
    displayName: 'Day before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      // Set to 20:00 previous day (modify only here when changing)
    },
    toleranceMs: 5 * 60 * 1000
  }
}

// ✅ Entities reference configuration
shouldSendNotification(type: NotificationType, currentTime: Date): boolean {
  return shouldSendNotificationAtTime(type, this.saleStartDate, currentTime);
}
```

#### Benefits

- **Maintainability**: Only modify one place when changing notification timing
- **Extensibility**: Easily add new notification types
- **Type safety**: Ensure consistency with TypeScript type checking

#### Applied Locations

- `src/domain/entities/NotificationConfig.ts`: Configuration definition
- `src/domain/entities/Ticket.ts`: Removed hard coding, use configuration
- `src/domain/entities/NotificationHistory.ts`: Unified display names and validation

## Command Execution Guidelines

### When Commands Fail Due to Permissions

If system modification commands (like `rm`, `mv`, `mkdir`) fail due to permission restrictions:

1. **Explain the situation clearly** to the user
2. **Provide the exact commands** in copy-pastable format
3. **Use alternative approaches** when possible (e.g., Edit/Write tools for file modifications)

#### Example Response Pattern:

````
⚠️ Permission denied for direct file deletion.

Please run the following commands manually:

```bash
rm docs/environment-setup.md
rm docs/ja/environment-setup.md
rm docs/ja/basic-design.md
rm docs/ja/detailed-design.md
````

Alternatively, I can mark files as DEPRECATED using the Edit tool.

```
#### Alternative Approaches:

- **File deletion**: Use Edit/Write to create DEPRECATED placeholders
- **File moves**: Use Read + Write to copy content to new location
- **Directory operations**: Provide manual commands with clear explanations
- **Git operations**: Always provide commands for user execution

### Command Format Requirements:

- Use proper code blocks with `bash` syntax highlighting
- Include clear descriptions of what each command does
- Group related commands together
- Provide verification commands when applicable
```

- to memorize 'write docs and code with deno fmt'

## Knowledge Base Documentation Policy

### 🎯 Personal Knowledge Base Integration

During development, proactively identify and document reusable technical knowledge for the personal
KB:

**Target Path**: `/Users/kazuyamatsuo/second_brain/30_Resources/SoftwareEngineer/`

#### Documentation Criteria

**✅ Should Document**:

- External service integrations (LINE Bot, Discord Webhook, etc.)
- Development tools and workflows (ngrok, testing patterns)
- Generic implementation patterns and best practices
- Security configurations and considerations
- Troubleshooting solutions for common development issues

**❌ Avoid Documenting**:

- Project-specific business logic
- Highly context-dependent implementations
- Temporary workarounds or project-specific configurations

#### Documentation Standards

**Content Requirements**:

- **Generic and reusable**: Avoid project-specific context dependencies
- **Concise and practical**: Focus on actionable information
- **Engineer-focused**: Assume technical background, skip basic concepts
- **Multi-language support**: Include both English and Japanese examples where relevant

**File Naming Convention**:

- Use descriptive, technology-focused names
- Avoid terms like "完全ガイド" (complete guide)
- Examples: `LINE Messaging API - Bot開発と配信実装.md`, `Discord Webhook - 外部サービス通知実装.md`

**Obsidian Format**:

- Include frontmatter with tags and metadata
- Use consistent heading structure
- Implement cross-references where appropriate

#### Integration Workflow

1. **During Development**: Identify reusable technical patterns
2. **Post-Implementation**: Create or update relevant KB documents
3. **Content Review**: Ensure generic applicability and conciseness
4. **Cross-Reference**: Link related documents and concepts

**Example Trigger Scenarios**:

- Setting up external service APIs
- Implementing webhook receivers
- Configuring development tools
- Solving common integration challenges
- Creating reusable testing patterns
