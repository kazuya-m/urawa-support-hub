# Issue Priority Roadmap

**Target**: Personal use MVP with minimal implementation\
**Created**: 2025-08-22\
**Updated**: 2025-08-23\
**Goal**: Launch MVP in 10 days

## Implementation Status Summary

- **Completed**: Domain models, repositories, database schema, scraping service, CI/CD
- **In Progress**: None
- **Not Started**: Cloud services, notifications, application layer

## Implementation Phases Overview

### Phase 1: Foundation Setup (3 days)

**Purpose**: Establish minimal development environment

| Issue | Title                                               | Priority    | Status           | Reason                                  |
| ----- | --------------------------------------------------- | ----------- | ---------------- | --------------------------------------- |
| #28   | Google Cloud Platform project and account setup     | 🔴 Critical | ❌ Not Started   | Prerequisites for all GCP services      |
| #29   | LINE Bot and Discord Webhook external service setup | 🔴 Critical | ❌ Not Started   | Prerequisites for notification features |
| #17   | Environment variables and basic secrets setup       | 🔴 Critical | ❌ Not Started   | Simplified security foundation          |
| #36   | Basic type definitions and entities                 | 🔴 Critical | ✅ **COMPLETED** | Core domain models                      |
| #37   | Supabase client and repositories                    | 🔴 Critical | ✅ **COMPLETED** | Data persistence layer                  |
| #39   | Minimal security configuration                      | 🔴 Critical | ❌ Not Started   | Basic security requirements             |
| #40   | Initial database schema creation                    | 🔴 Critical | ✅ **COMPLETED** | Database structure                      |

### Phase 2: Core Feature Implementation (3 days)

**Purpose**: Implement scraping and scheduling functionality

| Issue | Title                                                     | Priority    | Status            | Reason                            |
| ----- | --------------------------------------------------------- | ----------- | ----------------- | --------------------------------- |
| #38   | Playwright scraping implementation                        | 🔴 Critical | ⚠️ **Local Only** | Core data retrieval functionality |
| #12   | Ticket management application service implementation      | 🔴 Critical | ❌ Not Started    | Core business logic               |
| #24   | Google Cloud Run scraping service implementation          | 🔴 Critical | ❌ Not Started    | Container deployment              |
| #26   | Cloud Scheduler daily execution setup implementation      | 🔴 Critical | ❌ Not Started    | Automation requirements           |
| #25   | Google Cloud Tasks notification scheduling implementation | 🔴 Critical | ❌ Not Started    | Notification timing control       |

### Phase 3: Notification Services (2 days)

**Purpose**: Implement notification delivery

| Issue | Title                                                      | Priority    | Status         | Reason                     |
| ----- | ---------------------------------------------------------- | ----------- | -------------- | -------------------------- |
| #27   | LINE notification service implementation                   | 🔴 Critical | ❌ Not Started | Main notification channel  |
| #30   | Discord error notification implementation                  | 🟠 High     | ❌ Not Started | Error alerts only          |
| #13   | Notification management application service implementation | 🔴 Critical | ❌ Not Started | Notification orchestration |

### Phase 4: Deployment (2 days)

**Purpose**: Automated deployment and testing

| Issue | Title               | Priority    | Status           | Reason               |
| ----- | ------------------- | ----------- | ---------------- | -------------------- |
| #33   | Minimal CI/CD setup | 🔴 Critical | ✅ **COMPLETED** | Automated deployment |
| -     | Manual testing      | 🔴 Critical | ❌ Not Started   | Final verification   |

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

## Current Status (2025-08-23)

### ✅ Completed Issues: 5/16 (31%)

- #36 - Basic type definitions and entities
- #37 - Supabase client and repositories
- #40 - Initial database schema creation
- #33 - CI/CD setup (GitHub Actions)
- Scraping service (local implementation only)

### ⚠️ In Progress: 0/16 (0%)

- None

### ❌ Not Started: 11/16 (69%)

- All GCP services (#28, #24, #25, #26)
- External services setup (#29)
- Environment variables (#17)
- Security configuration (#39)
- Application services layer (#12, #13)
- Notification services (#27, #30)

## Next Steps Priority

1. **#28** - GCP project setup (blocker for all cloud services)
2. **#29** - LINE/Discord external setup (blocker for notifications)
3. **#17** - Environment variables setup
4. **#24** - Deploy scraping to Cloud Run
5. **#26** - Setup Cloud Scheduler

## Progress Tracking

```bash
# Check progress by phase
gh issue list --label "phase-1-foundation" --state "open"
gh issue list --label "phase-2-core" --state "open"
gh issue list --label "phase-3-notification" --state "open"

# Check overall progress
gh issue list --state "open"

# Check completed
gh issue list --state "closed"
```
