# Issue Priority Roadmap

**Target**: Personal use MVP with minimal implementation\
**Created**: 2025-08-22\
**Updated**: 2025-08-23\
**Goal**: Launch MVP in 10 days

## Implementation Phases Overview

### Phase 1: Foundation Setup (3 days)

**Purpose**: Establish minimal development environment

| Issue | Title                                               | Priority    | Reason                                  |
| ----- | --------------------------------------------------- | ----------- | --------------------------------------- |
| #28   | Google Cloud Platform project and account setup     | 🔴 Critical | Prerequisites for all GCP services      |
| #29   | LINE Bot and Discord Webhook external service setup | 🔴 Critical | Prerequisites for notification features |
| #17   | Environment variables and basic secrets setup       | 🔴 Critical | Simplified security foundation          |
| #36   | Basic type definitions and entities                 | 🔴 Critical | Core domain models                      |
| #37   | Supabase client and repositories                    | 🔴 Critical | Data persistence layer                  |
| #39   | Minimal security configuration                      | 🔴 Critical | Basic security requirements             |
| #40   | Initial database schema creation                    | 🔴 Critical | Database structure                      |

### Phase 2: Core Feature Implementation (3 days)

**Purpose**: Implement scraping and scheduling functionality

| Issue | Title                                                     | Priority    | Reason                            |
| ----- | --------------------------------------------------------- | ----------- | --------------------------------- |
| #38   | Playwright scraping implementation                        | 🔴 Critical | Core data retrieval functionality |
| #12   | Ticket management application service implementation      | 🔴 Critical | Core business logic               |
| #24   | Google Cloud Run scraping service implementation          | 🔴 Critical | Container deployment              |
| #26   | Cloud Scheduler daily execution setup implementation      | 🔴 Critical | Automation requirements           |
| #25   | Google Cloud Tasks notification scheduling implementation | 🔴 Critical | Notification timing control       |

### Phase 3: Notification Services (2 days)

**Purpose**: Implement notification delivery

| Issue | Title                                                       | Priority    | Reason                     |
| ----- | ----------------------------------------------------------- | ----------- | -------------------------- |
| #27   | LINE notification service implementation                    | 🔴 Critical | Main notification channel  |
| #30   | Discord error notification implementation                   | 🟠 High     | Error alerts only          |
| #13   | Notification management application service implementation  | 🔴 Critical | Notification orchestration |

### Phase 4: Deployment (2 days)

**Purpose**: Automated deployment and testing

| Issue | Title                     | Priority    | Reason                      |
| ----- | ------------------------- | ----------- | --------------------------- |
| #33   | Minimal CI/CD setup       | 🔴 Critical | Automated deployment        |
| -     | Manual testing            | 🔴 Critical | Final verification          |

## Removed Issues (Personal use - not needed)

- ~~#34 Security and permission detailed design~~ - Over-engineering
- ~~#32 Database migration management~~ - Initial schema only
- ~~#18 End-to-end test suite~~ - Manual testing sufficient
- ~~#31 Notification service integration~~ - Included in each service
- ~~#16 System health monitoring Edge Function~~ - Discord alerts sufficient
- ~~#15 Notification Edge Function~~ - Direct notification from Cloud Run

## Development Progress Rules

### 1. Keep It Simple
- Minimal implementation for personal use
- No staging environment
- Direct deployment to production
- Manual testing acceptable

### 2. Branch Strategy
- **Pattern**: `feature/#<issue-number>_<description>`
- **Example**: `feature/#36_basic-types`

### 3. Completion Criteria
Each issue is considered complete when:
- [ ] Feature works
- [ ] `deno check` passes
- [ ] Manual test passes

## Milestones

### MVP Launch (10 days from start)
- **Target**: All issues in Phase 1-4
- **Success Criteria**: Basic ticket monitoring and LINE notification working

## Progress Tracking

```bash
# Check progress by phase
gh issue list --label "phase-1-foundation" --state "open"
gh issue list --label "phase-2-core" --state "open"
gh issue list --label "phase-3-notification" --state "open"

# Check overall progress
gh issue list --state "open"
```