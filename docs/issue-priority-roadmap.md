# Issue Priority Roadmap

**Target**: Personal development, launch-first approach\
**Created**: 2025-08-22\
**Goal**: Launch MVP by end of September 2025

## Implementation Phases Overview

### Phase 1: Foundation Setup (Required - Must complete before launch)

**Deadline**: By 1st week of September\
**Purpose**: Establish development and deployment environment

| Issue | Title                                               | Priority    | Reason                                  |
| ----- | --------------------------------------------------- | ----------- | --------------------------------------- |
| #28   | Google Cloud Platform project and account setup     | 🔴 Critical | Prerequisites for all GCP services      |
| #29   | LINE Bot and Discord Webhook external service setup | 🔴 Critical | Prerequisites for notification features |
| #17   | Complete environment setup and secret management    | 🔴 Critical | Security and deployment foundation      |

### Phase 2: Core Feature Implementation (Required for launch)

**Deadline**: 2nd-3rd week of September\
**Purpose**: Implement scraping and scheduling functionality

| Issue | Title                                                     | Priority    | Reason                            |
| ----- | --------------------------------------------------------- | ----------- | --------------------------------- |
| #12   | Ticket management application service implementation      | 🔴 Critical | Core business logic               |
| #24   | Google Cloud Run scraping service implementation          | 🔴 Critical | Core data retrieval functionality |
| #26   | Cloud Scheduler daily execution setup implementation      | 🔴 Critical | Automation requirements           |
| #25   | Google Cloud Tasks notification scheduling implementation | 🔴 Critical | Notification timing control       |

### Phase 3: Notification Services (Required for launch)

**Deadline**: 3rd-4th week of September\
**Purpose**: Implement actual notification delivery functionality

| Issue | Title                                                           | Priority    | Reason                                    |
| ----- | --------------------------------------------------------------- | ----------- | ----------------------------------------- |
| #27   | LINE notification service implementation                        | 🔴 Critical | Main notification channel                 |
| #30   | Discord notification service implementation                     | 🟠 High     | Sub notification channel and error alerts |
| #13   | Notification management application service implementation      | 🔴 Critical | Notification logic integration            |
| #15   | Supabase Edge Function for notification delivery implementation | 🔴 Critical | Notification delivery execution layer     |

### Phase 4: Integration & Minimal Operations Preparation (Pre-launch)

**Deadline**: 4th week of September\
**Purpose**: System integration and final preparation before launch

| Issue | Title                                                              | Priority    | Reason                         |
| ----- | ------------------------------------------------------------------ | ----------- | ------------------------------ |
| #31   | Notification service integration and adjustment                    | 🔴 Critical | Final integration adjustment   |
| #16   | Supabase Edge Function for system health monitoring implementation | 🟠 High     | Minimum operational monitoring |

## Minimum Launch Conditions

Upon completion of Phase 1-4, the following will be achieved:

- ✅ Daily ticket information retrieval
- ✅ LINE and Discord notification delivery
- ✅ Basic error monitoring

### Phase 5: Operational Improvements (Post-launch implementation)

**Deadline**: Implement gradually during operation\
**Purpose**: Improve operational efficiency and code quality

| Issue | Title                                              | Priority  | Reason                                |
| ----- | -------------------------------------------------- | --------- | ------------------------------------- |
| #32   | Database migration management                      | 🟡 Medium | Safety improvement for schema changes |
| #33   | CI/CD pipeline setup                               | 🟡 Medium | Deployment efficiency                 |
| #18   | End-to-end integration test suite creation         | 🟡 Medium | Quality improvement                   |
| #34   | Security and permission management detailed design | 🟡 Medium | Security enhancement                  |

## Development Progress Rules

### 1. Phase Adherence

- **Required**: Proceed to next phase only after previous phase completion
- **Reason**: Development efficiency and risk management through dependency management

### 2. Branch Strategy

- **Pattern**: `feature/#<issue-number>_<description>`
- **Example**: `feature/#28_gcp-project-setup`

### 3. Completion Criteria

Each issue is considered complete when the following conditions are met:

- [ ] Feature implementation complete
- [ ] `deno check` success
- [ ] `deno lint` success
- [ ] Unit tests created and passing
- [ ] Integration tests executed and passing

### 4. Emergency Response

If Phase 1-4 requires more effort than expected:

- **Priority**: Prioritize launch even with feature reduction
- **Deferrable**: Move Discord notifications (#30) to Phase 5
- **Deferrable**: Simplify system monitoring features (#16)

## Milestones

### MVP Launch (2025-09-30)

- **Target**: All issues in Phase 1-4
- **Success Criteria**: Basic ticket monitoring and notification functionality operational

### Post-Launch Improvements (No deadline)

- **Target**: All issues in Phase 5
- **Success Criteria**: Gradual improvement of operational efficiency and quality

## Progress Tracking Methods

```bash
# Check progress by phase
gh issue list --milestone "MVP Launch" --label "phase-1-foundation"
gh issue list --milestone "MVP Launch" --label "phase-2-core"
# Continue similarly...

# Check overall progress
gh issue list --milestone "MVP Launch" --state "open"
```
