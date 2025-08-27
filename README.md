# urawa-support-hub

Automated notification system for Urawa Red Diamonds away match ticket sales information

> **Clean Architecture** | **Comprehensive Testing** | **Automated CI/CD**

## Overview

A system that automatically retrieves Urawa Red Diamonds away match ticket information from the
J-League ticket site and sends LINE notifications before sales start.

### System Features

- **Domain Layer**: Ticket, NotificationHistory entities with business logic
- **Infrastructure Layer**: Repository pattern implementation
- **Configuration-driven Design**: NOTIFICATION_TIMING_CONFIG for operational changes
- **Integration Testing**: Comprehensive test coverage for entities, repositories, and integration
- **CI/CD Pipeline**: Automated GitHub Actions workflow
- **Error Handling**: Unified error processing infrastructure

## Architecture

### Clean Architecture Structure

```
┌─────────────────────────────────────┐
│     Edge Functions (Interface)     │  ← daily-check, notification-check
├─────────────────────────────────────┤
│      Application Services          │  ← ScrapingService, NotificationService  
├─────────────────────────────────────┤
│        Domain Layer                │  ← Entities: Ticket, NotificationHistory
│                                     │    Interfaces: TicketRepository
├─────────────────────────────────────┤
│     Infrastructure Layer           │  ← RepositoryImpl, Supabase Client
└─────────────────────────────────────┘
```

### Directory Structure

```
src/
├── domain/                    # Domain layer
│   ├── entities/             # Business entities (Classes)
│   │   ├── Ticket.ts         # Ticket entity + business logic
│   │   ├── NotificationHistory.ts
│   │   └── __tests__/        # Entity unit tests
│   └── interfaces/           # Repository interfaces
├── infrastructure/           # Infrastructure layer  
│   ├── repositories/         # Repository implementations
│   │   ├── TicketRepositoryImpl.ts
│   │   ├── converters/       # DB↔Domain conversion
│   │   └── __tests__/        # Repository unit tests
│   └── utils/                # Infrastructure common processing
└── tests/integration/        # Integration tests
```

## Technology Stack

- **Runtime**: Deno + TypeScript
- **Database**: Supabase PostgreSQL
- **Functions**: Supabase Edge Functions
- **Scraping**: Playwright
- **Notifications**: LINE Messaging API + Discord Webhook
- **Scheduler**: pg_cron
- **CI/CD**: GitHub Actions (optimized)

## Documentation

Detailed design and requirements documents are organized in the `/docs` directory.

- [Requirements](docs/requirements.md)
- [Technology Selection](docs/tech-selection.md) - Updated with implementation status
- [Basic Design](docs/basic-design.md) - Reflects Clean Architecture
- [Detailed Design](docs/detailed-design.md) - Reflects implemented entities
- [Architecture Design](docs/architecture.md) - Reflects implementation structure
- [Environment Setup](docs/environment-setup.md) - Updated to current environment

## Development Environment Setup

### 1. Prerequisites

- **Deno** v2.x
- **Supabase CLI**

```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Install Supabase CLI
npm install -g supabase
```

### 2. Project Setup

```bash
# Clone repository
git clone https://github.com/kazuya-m/urawa-support-hub.git
cd urawa-support-hub

# Start Supabase local environment
supabase start

# Check dependencies
deno check **/*.ts
```

### 3. Test Execution

```bash
# Run all tests (45 cases)
deno test --allow-env --allow-net=127.0.0.1 --coverage=coverage

# Unit tests only
deno test src/ --coverage=coverage

# Integration tests only  
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# Type check
deno check src/

# Lint check
deno lint src/
```

### 4. Development Commands

```bash
# Start local development server
supabase functions serve

# Reset database
supabase db reset

# Format
deno fmt

# Display test coverage
deno coverage coverage

# Pre-commit checks (type + lint)
deno task pre-commit
```

### 5. Pre-commit Hook Setup (Optional)

To automatically run type and lint checks before commits:

```bash
# Copy the pre-commit hook
cp hooks/pre-commit .git/hooks/

# Make it executable
chmod +x .git/hooks/pre-commit
```

This will automatically run `deno check` and `deno lint` before each commit, preventing commits with
type errors or lint violations.

## CI/CD

### GitHub Actions Optimized

- **Single job structure**: Efficiently executes lint → test → coverage
- **GitHub Secrets**: Secure management of environment variables
- **Minimum privileges**: Security enhancement with `--allow-env --allow-net=127.0.0.1`

### Required GitHub Secrets

```
SUPABASE_URL: https://your-project.supabase.co
SUPABASE_ANON_KEY: your-anon-key
SUPABASE_SERVICE_ROLE_KEY: your-service-role-key
```

## Testing

### Test Structure (45 Cases)

- **Entity tests**: 19 cases (Ticket: 8, NotificationHistory: 11)
- **Repository tests**: 17 cases (TicketRepo: 9, NotificationRepo: 8)
- **Integration tests**: 9 cases (General repository operations)

### Test Execution Permissions

```bash
# ✅ Recommended: Minimum privileges
deno test --allow-env --allow-net=127.0.0.1

# ❌ Not recommended: All privileges
deno test --allow-all
```

## Operations

### Free Tier Operations

- **Supabase**: DB 500MB + Functions 500,000 calls/month
- **LINE Messaging API**: 1,000 messages/month
- **Discord Webhook**: Unlimited

### Estimated Usage

- DB usage: Less than 10MB
- Functions execution: Approximately 8,760 calls/month
- Notification sending: Approximately 20 messages/month (LINE) + 50 messages/month (Discord
  monitoring)

**Total cost: $0.00/month (All within free tier)**
