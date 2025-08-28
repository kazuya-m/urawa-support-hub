# Environment Setup Guide

Simple setup guide for the urawa-support-hub Google Cloud + Supabase hybrid architecture.

## Quick Start

### Prerequisites

```bash
# 1. Install required tools
curl -fsSL https://deno.land/install.sh | sh  # Deno runtime
npm install -g supabase                       # Supabase CLI
curl https://sdk.cloud.google.com | bash     # Google Cloud CLI

# 2. Verify installations
deno --version
supabase --version
gcloud --version
```

### Core Setup

#### 1. Supabase Setup

```bash
# Login and create project
supabase login
supabase init
supabase start

# Note the local URLs and keys from supabase status
```

#### 2. Google Cloud Setup

```bash
# Login and set project
gcloud auth login
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudtasks.googleapis.com
```

#### 3. Environment Variables

Create `.env` file:

```bash
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
CLOUD_TASKS_LOCATION=asia-northeast1
CLOUD_TASKS_QUEUE=notifications

# External Services
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
DISCORD_WEBHOOK_URL=your-discord-webhook
```

## Development Workflow

### Daily Commands

```bash
# Start local environment
supabase start

# Run tests
deno test --allow-env --allow-net=127.0.0.1

# Type check
deno check src/**/*.ts

# Format code
deno fmt src/
```

### Architecture-Specific Setup

#### Cloud Run Configuration

- **Memory**: 2GB (for Playwright scraping)
- **Timeout**: 300 seconds
- **Concurrency**: 1 (sequential processing)

#### Cloud Tasks Configuration

- **Queue**: notifications
- **Location**: asia-northeast1
- **Retry**: 3 attempts with exponential backoff

## Testing Setup

### Local Testing

```bash
# Unit tests
deno test src/ --coverage

# Integration tests with Supabase
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# Test permissions (minimal required)
--allow-env --allow-net=127.0.0.1
```

### Cloud Integration Testing

```bash
# Test Cloud Run locally
deno run --allow-net --allow-env src/main.ts

# Test with curl
curl -X POST 'http://localhost:8080/api/send-notification' \
  -H 'Content-Type: application/json' \
  -d '{"ticketId": "test-123", "notificationType": "day_before"}'
```

## Deployment

### Database Deployment

```bash
# Deploy database schema
supabase db push
```

### Cloud Run Deployment

```bash
# Build and deploy
gcloud run deploy urawa-scraper \
  --source . \
  --region asia-northeast1 \
  --memory 2Gi \
  --timeout 300
```

### Scheduler Setup

```bash
# Create daily trigger
gcloud scheduler jobs create http daily-scraping \
  --location asia-northeast1 \
  --schedule="0 3 * * *" \
  --uri="your-cloud-run-url/scrape"
```

## Troubleshooting

### Common Issues

**Supabase Connection**

```bash
# Check status
supabase status

# Restart services
supabase stop && supabase start
```

**Google Cloud Auth**

```bash
# Check authentication
gcloud auth list

# Re-authenticate
gcloud auth login
```

**Memory Issues**

- Use Cloud Run (2GB) for all operations including notifications
- Supabase is used only for database and PostgREST API
- All business logic runs in Cloud Run

## Architecture Notes

- **Application Runtime**: All business logic runs in Cloud Run
- **Scraping**: Playwright execution with adequate memory (2GB)
- **Notifications**: LINE/Discord delivery via Cloud Run endpoints
- **Scheduling**: Cloud Scheduler + Cloud Tasks for reliability
- **Database**: Supabase PostgreSQL with automatic API generation
- **Cost**: Designed to operate within free tier limits

## Next Steps

1. Follow the [system architecture documentation](system-architecture.md) for system design
2. Review [technology selection rationale](tech-selection.md)
3. Check [requirements documentation](requirements.md) for specifications
4. Refer to [implementation guide](implementation-guide.md)

---

For detailed architecture information, always refer to the latest documentation in `/docs`.
