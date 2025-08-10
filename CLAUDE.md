# urawa-support-hub Claude Code Development Guide

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
   git add . && git commit -m "implement TicketRepository interface and Supabase implementation"
   ```

2. **Commit Units**: One commit per logical change
   - ✅ Good: "add Ticket type definition"
   - ✅ Good: "implement SupabaseTicketRepository save method"
   - ❌ Bad: "implement everything for ticket management"

3. **Pull Requests**: Merge to main or develop after feature completion

### Current Implementation Phase

Phase 1: Foundation building and core feature implementation

### Next Steps

1. Foundation setup (project structure, Deno configuration)
2. Supabase initialization (DB schema)
3. Type definition creation
4. Repository layer implementation
5. Notification service implementation
6. Scraping functionality implementation
7. Edge Functions implementation
8. Test implementation

### Technology Stack

- Runtime: Deno + TypeScript
- Database: Supabase PostgreSQL
- Functions: Supabase Edge Functions
- Scraping: Playwright
- Notifications: LINE Messaging API + Discord Webhook
- Scheduler: pg_cron

### Environment Setup Status

- LINE Messaging API: ✅ Setup complete
- Discord Webhook: Not configured
- Supabase: Not initialized

### Important Constraints

- Memory limit: 512MB (Edge Functions)
- Execution time limit: 60 seconds
- Must operate within free tier

## Development Notes

- Always investigate J-League ticket site structure before implementation
- Implement error handling for each feature
- Record appropriate debug information in log output
- Practice test-driven development

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

- **Unit test creation**: Tests to verify individual function/method behavior (in `__tests__/`
  directory at same level as target file)
- **Integration test script creation**: Executable tests to verify key functionality
  (`tests/integration/`)
- **Testing with actual data**: Use test data that matches actual constraints rather than dummy data
- **Boundary value testing**: Verify behavior in normal, exceptional, and boundary value cases
- **Mock testing**: Unit tests with mocked external dependencies
- **Cleanup processing**: Complete tests including data deletion after testing
- **Test result verification**: Confirm all test cases succeed

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

#### 1. Technology Selection and Consistency Principles

**🎯 Project Technology Stack Priority**:
- **Primary consideration**: Maintain consistency with project's technology choices (Deno + TypeScript)
- **External dependencies**: Minimize external dependencies; prioritize Deno ecosystem solutions
- **Existing patterns**: Leverage existing project patterns (e.g., `deno task` usage in deno.json)

**🎯 Problem-solving Approach**:
- **Requirements-based**: Start with "what needs to be achieved" rather than "which tool to use"
- **Project context**: Understand project philosophy and constraints before proposing solutions
- **Avoid tool fixation**: Don't default to popular tools; find project-optimal solutions

**Examples**:
```typescript
// ✅ Good: Deno-native approach
"pre-commit": "deno check src/**/*.ts && deno lint"

// ❌ Bad: External tool dependency (without justification)  
"pre-commit": "pre-commit run --all-files"
```

#### 2. Naming Conventions

```typescript
// ✅ Good: Technology independent
export class TicketRepositoryImpl implements TicketRepository

// ❌ Bad: External service dependent
export class SupabaseTicketRepository implements TicketRepository
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

- [ ] Use `{Entity}RepositoryImpl` naming
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
