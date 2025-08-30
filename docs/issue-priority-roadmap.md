# Issue Priority Roadmap

**Target**: Personal use MVP with minimal implementation\
**Created**: 2025-08-22\
**Updated**: 2025-08-30\
**Goal**: Launch MVP by 2025-09-30

## Implementation Status Summary

- **Completed**: Foundation setup, external services, domain models, database schema, notification
  services, application layer
- **In Progress**: Cloud Run deployment (#24), notification management (#13), Discord notifications
  (#30)
- **Not Started**: Google Cloud services integration, final deployment

## Implementation Phases Overview

### Phase 1: Foundation Setup (3 days)

**Purpose**: Establish minimal development environment

| Issue | Title                                               | Priority    | Status           | Reason                                  |
| ----- | --------------------------------------------------- | ----------- | ---------------- | --------------------------------------- |
| #28   | Google Cloud Platform project and account setup     | 🔴 Critical | ✅ **COMPLETED** | Prerequisites for all GCP services      |
| #29   | LINE Bot and Discord Webhook external service setup | 🔴 Critical | ✅ **COMPLETED** | Prerequisites for notification features |
| #17   | Environment variables and basic secrets setup       | 🔴 Critical | ✅ **COMPLETED** | Simplified security foundation          |
| #36   | Basic type definitions and entities                 | 🔴 Critical | ✅ **COMPLETED** | Core domain models                      |
| #37   | Supabase client and repositories                    | 🔴 Critical | ✅ **COMPLETED** | Data persistence layer                  |
| #39   | Minimal security configuration                      | 🔴 Critical | ✅ **COMPLETED** | Basic security requirements             |
| #40   | Initial database schema creation                    | 🔴 Critical | ✅ **COMPLETED** | Database structure                      |

### Phase 2: Core Feature Implementation (3 days)

**Purpose**: Implement scraping and scheduling functionality

| Issue | Title                                                     | Priority    | Status             | Reason                            |
| ----- | --------------------------------------------------------- | ----------- | ------------------ | --------------------------------- |
| #38   | Playwright scraping implementation                        | 🔴 Critical | ✅ **COMPLETED**   | Core data retrieval functionality |
| #12   | Ticket management application service implementation      | 🔴 Critical | ✅ **COMPLETED**   | Core business logic               |
| #24   | Google Cloud Run scraping service implementation          | 🔴 Critical | ⏳ **IN PROGRESS** | Container deployment              |
| #26   | Cloud Scheduler daily execution setup implementation      | 🔴 Critical | ❌ Not Started     | Automation requirements           |
| #25   | Google Cloud Tasks notification scheduling implementation | 🔴 Critical | ❌ Not Started     | Notification timing control       |

### Phase 3: Notification Services (2 days)

**Purpose**: Implement notification delivery

| Issue | Title                                                      | Priority    | Status             | Reason                     |
| ----- | ---------------------------------------------------------- | ----------- | ------------------ | -------------------------- |
| #27   | LINE notification service implementation                   | 🔴 Critical | ✅ **COMPLETED**   | Main notification channel  |
| #30   | Discord error notification implementation                  | 🟠 High     | ⏳ **IN PROGRESS** | Error alerts only          |
| #13   | Notification management application service implementation | 🔴 Critical | ⏳ **IN PROGRESS** | Notification orchestration |

### Phase 4: Deployment (2 days)

**Purpose**: Automated deployment and testing

| Issue | Title               | Priority    | Status             | Reason               |
| ----- | ------------------- | ----------- | ------------------ | -------------------- |
| #33   | Minimal CI/CD setup | 🔴 Critical | ⏳ **IN PROGRESS** | Automated deployment |
| -     | Manual testing      | 🔴 Critical | ❌ Not Started     | Final verification   |

## Completed Issues (Additional implementations)

- **#9** - J-League ticket site web scraping service ✅
- **#10** - LINE Messaging API notification service ✅
- **#11** - Discord Webhook system monitoring ✅
- **#14** - Daily ticket scraping Edge Function ✅
- **#15** - Notification delivery Edge Function ✅
- **#16** - System health monitoring Edge Function ✅
- **#18** - End-to-end integration test suite ✅
- **#21** - Architecture documentation update ✅
- **#22** - External scraping environment implementation ✅
- **#31** - Notification service integration ✅
- **#32** - Database migration management ✅
- **#34** - Security and permission detailed design ✅
- **#27** - LINE APIエンドポイント設定統一化（2025-08-27品質改善） ✅

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

### MVP Launch (Target: 2025-09-30)

- **Target**: Complete Google Cloud integration and production deployment
- **Success Criteria**: Automated daily ticket monitoring with LINE/Discord notifications
- **Remaining**: 3 issues (12% of total scope)

## Current Status (2025-08-30)

### ✅ Completed Issues: 21/25 (84%)

**Foundation & Infrastructure:**

- #28 - Google Cloud Platform project setup
- #29 - LINE Bot and Discord Webhook external setup
- #17 - Environment variables and basic secrets setup
- #36 - Basic type definitions and entities
- #37 - Supabase client and repositories
- #39 - Minimal security configuration
- #40 - Initial database schema creation

**Core Services:**

- #9 - J-League ticket site web scraping service
- #10 - LINE Messaging API notification service
- #11 - Discord Webhook system monitoring
- #14 - Daily ticket scraping Edge Function
- #15 - Notification delivery Edge Function
- #16 - System health monitoring Edge Function
- #27 - LINE notification service implementation
- #12 - Ticket management application service implementation
- #38 - Playwright scraping implementation

**Testing & Documentation:**

- #18 - End-to-end integration test suite
- #21 - Architecture documentation update
- #22 - External scraping environment implementation
- #31 - Notification service integration
- #32 - Database migration management
- #34 - Security and permission detailed design

### ⏳ In Progress: 4/25 (16%)

- #13 - Notification management application service
- #30 - Discord error notification implementation
- #33 - Minimal CI/CD setup
- #24 - Google Cloud Run scraping service implementation

### ❌ Not Started: 2/25 (8%)

- #25 - Google Cloud Tasks notification scheduling
- #26 - Cloud Scheduler daily execution setup
- Manual testing

## Next Steps Priority

1. **#13** - Complete notification management application service (notification orchestration)
2. **#24** - Deploy scraping to Cloud Run (production deployment)
3. **#25** - Setup Google Cloud Tasks notification scheduling
4. **#26** - Setup Cloud Scheduler daily execution

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
