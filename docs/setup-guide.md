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

##### Local Development

Create `.env` file from template:

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

Required environment variables:

- **Supabase**: URL, Anon Key, Service Role Key
- **Google Cloud**: Project ID, Region, Service Names
- **LINE API**: Channel Access Token
- **Cloud Monitoring**: Alert Policy for Discord notifications

See [`.env.example`](../.env.example) for complete list with descriptions.

##### Production (GitHub Actions)

For CI/CD and production deployments, configure GitHub Secrets:

1. Go to Repository Settings → Secrets and variables → Actions
2. Add required secrets (see [GitHub Secrets Setup Guide](github-secrets-setup.md))
3. Verify secrets in GitHub Actions workflows

⚠️ **Security Note**: Never commit `.env` files or secrets to version control

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

### Cloud Scheduler Setup

#### Prerequisites

**1. Service Account Creation (Manual)**

Create the scheduler service account **before** CI/CD deployment:

```bash
# Set your project ID
export GC_PROJECT_ID=your-project-id

# Create service account for scheduler
gcloud iam service-accounts create scheduler-sa \
  --display-name="Scheduler Service Account" \
  --description="Service account for Cloud Scheduler to invoke Cloud Run"

# Grant Cloud Run invoker permission
gcloud run services add-iam-policy-binding your-service-name \
  --member="serviceAccount:scheduler-sa@${GC_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --region=asia-northeast1
```

**2. GitHub Secrets Configuration**

Add these secrets for automatic deployment:

- `GC_PROJECT_ID`: Your GCP project ID
- `GC_SA_SCHEDULER`: `scheduler-sa@your-project-id.iam.gserviceaccount.com`
- `GC_SA_CICID`: CI/CD service account key (JSON)
- `CLOUD_RUN_URL`: Your Cloud Run service URL

#### Automatic Deployment (Recommended)

The scheduler deploys automatically via GitHub Actions when changes are pushed to:

- `infrastructure/scheduler/**`
- `.github/workflows/deploy-scheduler.yml`

#### Manual Deployment (Alternative)

```bash
# Set variables
export GC_PROJECT_ID=your-project-id
export GC_SA_SCHEDULER=scheduler-sa@${GC_PROJECT_ID}.iam.gserviceaccount.com
export CLOUD_RUN_URL=your-cloud-run-service-url

# Create scheduler job (05:00 JST daily)
gcloud scheduler jobs create http your-job-name \
  --location=asia-northeast1 \
  --schedule="0 20 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="${CLOUD_RUN_URL}/api/collect-tickets" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"source":"cloud-scheduler"}' \
  --attempt-deadline="300s" \
  --max-retry-attempts=3 \
  --oidc-service-account-email="${GC_SA_SCHEDULER}"
```

#### Verification

```bash
# Check scheduler job
gcloud scheduler jobs describe your-job-name --location=asia-northeast1

# Test execution
gcloud scheduler jobs run your-job-name --location=asia-northeast1

# Check logs
gcloud logging read 'resource.type=cloud_scheduler_job' --limit=5
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
