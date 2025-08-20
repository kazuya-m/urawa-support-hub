# Environment Setup Guide v2.0

## Prerequisites

### Required Software

1. **Deno Runtime v2.x**
   ```bash
   # Install Deno
   curl -fsSL https://deno.land/install.sh | sh

   # Verify installation
   deno --version
   ```

2. **Supabase CLI**
   ```bash
   # Install via npm
   npm install -g supabase

   # Verify installation
   supabase --version
   ```

3. **Google Cloud CLI (New in v2.0)**
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL

   # Verify installation
   gcloud --version
   ```

4. **Docker (New in v2.0)**
   ```bash
   # Install Docker (platform specific)
   # For macOS: Download Docker Desktop
   # For Linux: Use package manager

   # Verify installation
   docker --version
   ```

5. **Git**
   ```bash
   git --version
   ```

## Local Development Setup

### 1. Repository Setup

```bash
# Clone repository
git clone https://github.com/kazuya-m/urawa-support-hub.git
cd urawa-support-hub

# Check project structure
ls -la
```

### 2. Google Cloud Platform Setup (New in v2.0)

#### GCP Project Setup

```bash
# Login to GCP
gcloud auth login

# Create new project (or use existing)
gcloud projects create urawa-support-hub --name="Urawa Support Hub"

# Set current project
gcloud config set project urawa-support-hub

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable cloudtasks.googleapis.com
gcloud services enable logging.googleapis.com
```

#### Service Account Setup

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create urawa-scraper \
    --display-name="Urawa Ticket Scraper Service Account"

# Create service account for Cloud Scheduler  
gcloud iam service-accounts create urawa-scheduler \
    --display-name="Urawa Scheduler Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding urawa-support-hub \
    --member="serviceAccount:urawa-scraper@urawa-support-hub.iam.gserviceaccount.com" \
    --role="roles/cloudtasks.enqueuer"

gcloud projects add-iam-policy-binding urawa-support-hub \
    --member="serviceAccount:urawa-scheduler@urawa-support-hub.iam.gserviceaccount.com" \
    --role="roles/run.invoker"
```

#### Cloud Tasks Queue Setup

```bash
# Create Cloud Tasks queue
gcloud tasks queues create notifications \
    --location=asia-northeast1 \
    --max-dispatches-per-second=10 \
    --max-concurrent-dispatches=10 \
    --max-attempts=3
```

### 3. Supabase Local Environment

```bash
# Initialize Supabase (first time only)
supabase init

# Start local Supabase stack
supabase start

# Check services status
supabase status
```

**Expected Output:**

```
supabase local development setup is running.

         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
```

### 4. Environment Variables

#### Local Development (.env)

```bash
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key-from-supabase-status
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-status

# Google Cloud Configuration (New in v2.0)
GOOGLE_CLOUD_PROJECT=urawa-support-hub
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
CLOUD_TASKS_QUEUE=notifications
CLOUD_TASKS_LOCATION=asia-northeast1

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_GROUP_ID=your-line-group-id

# Discord Webhook (Optional)
DISCORD_WEBHOOK_URL=your-discord-webhook-url

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
```

#### Service Account Key Generation

```bash
# Generate service account key for local development
gcloud iam service-accounts keys create ./keys/service-account-key.json \
    --iam-account=urawa-scraper@urawa-support-hub.iam.gserviceaccount.com

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS=./keys/service-account-key.json
```

### 5. Database Schema Setup

```bash
# Apply database migrations
supabase db reset

# Verify schema
supabase db diff
```

## Development Workflow

### Daily Development Commands

#### Core Development

```bash
# Start development session
supabase start

# Run type checking
deno check **/*.ts

# Run linting
deno lint src/

# Format code
deno fmt src/

# Run all tests
deno test --allow-env --allow-net=127.0.0.1 --coverage=coverage

# View test coverage
deno coverage coverage
```

#### GCP Development (New in v2.0)

```bash
# Build Cloud Run container locally
docker build -t urawa-scraper .

# Test Cloud Run container locally
docker run -p 8080:8080 --env-file .env urawa-scraper

# Deploy to Cloud Run (when ready)
gcloud run deploy urawa-scraper \
  --source . \
  --region asia-northeast1 \
  --memory 2Gi \
  --timeout 300 \
  --max-instances 1
```

### Edge Functions Development

```bash
# Serve Edge Functions locally
supabase functions serve

# Test notification function
curl -X POST 'http://127.0.0.1:54321/functions/v1/send-notification' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{"ticketId": "test-id", "notificationType": "day_before"}'
```

### Database Operations

```bash
# View database in browser
supabase db studio

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.ts

# Create new migration
supabase db diff --use-migra -f your_migration_name

# Reset to clean state
supabase db reset
```

### Cloud Tasks Development

```bash
# List tasks in queue
gcloud tasks list --queue=notifications --location=asia-northeast1

# Create test task
gcloud tasks create-http-task test-task \
  --queue=notifications \
  --location=asia-northeast1 \
  --url="http://localhost:54321/functions/v1/send-notification" \
  --method=POST \
  --header="Content-Type=application/json" \
  --body-content='{"test": true}'
```

## Testing Setup

### Test Environment Configuration

```bash
# Run unit tests only
deno test src/ --coverage=coverage

# Run integration tests
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# Run Cloud Run integration tests (requires Docker)
deno test tests/cloud-run/ --allow-env --allow-net --allow-run=docker

# Run specific test file
deno test src/domain/entities/__tests__/Ticket.test.ts

# Watch mode for development
deno test --watch src/
```

### Test Permissions

**Required minimal permissions:**

```bash
--allow-env                    # Environment variables access
--allow-net=127.0.0.1         # Local Supabase connection
--allow-run=docker            # Docker commands for Cloud Run tests
```

**Prohibited permissions:**

```bash
--allow-all                   # Too permissive, security risk
--allow-net                   # Too broad, should be specific
```

## Production Environment Setup

### 1. Supabase Cloud Setup

#### Create Supabase Project

1. Visit [supabase.com](https://supabase.com)
2. Create new project
3. Note project URL and API keys
4. Enable necessary extensions

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
```

#### Deploy Database Schema

```bash
# Link to remote project
supabase link --project-ref your-project-id

# Push local migrations
supabase db push
```

#### Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy send-notification

# Set function secrets
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=your-production-token
supabase secrets set DISCORD_WEBHOOK_URL=your-discord-webhook
```

### 2. Google Cloud Production Setup

#### Cloud Run Deployment

```bash
# Build and deploy to Cloud Run
gcloud run deploy urawa-scraper \
  --source . \
  --region asia-northeast1 \
  --memory 2Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 3 \
  --min-instances 0 \
  --port 8080 \
  --allow-unauthenticated=false

# Set environment variables
gcloud run services update urawa-scraper \
  --region asia-northeast1 \
  --set-env-vars SUPABASE_URL=https://your-project.supabase.co,SUPABASE_SERVICE_ROLE_KEY=your-key
```

#### Cloud Scheduler Setup

```bash
# Create daily scraping schedule
gcloud scheduler jobs create http daily-scraping \
  --location asia-northeast1 \
  --schedule="0 3 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://urawa-scraper-xxx-an.a.run.app/scrape" \
  --http-method=POST \
  --oidc-service-account-email=urawa-scheduler@urawa-support-hub.iam.gserviceaccount.com
```

#### Cloud Tasks Queue (Production)

```bash
# Create production queue
gcloud tasks queues create notifications-prod \
  --location=asia-northeast1 \
  --max-dispatches-per-second=50 \
  --max-concurrent-dispatches=100 \
  --max-attempts=3 \
  --max-retry-duration=3600s
```

### 3. Environment Variables (Production)

#### Cloud Run Environment Variables

```bash
# Set via gcloud CLI
gcloud run services update urawa-scraper \
  --region asia-northeast1 \
  --set-env-vars \
    SUPABASE_URL=https://your-project.supabase.co,\
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key,\
    CLOUD_TASKS_QUEUE=notifications-prod,\
    CLOUD_TASKS_LOCATION=asia-northeast1,\
    LOG_LEVEL=info
```

#### GitHub Secrets (CI/CD)

```yaml
# Required GitHub Secrets
SUPABASE_ACCESS_TOKEN: your-supabase-access-token
SUPABASE_PROJECT_ID: your-project-id
GOOGLE_CLOUD_PROJECT: urawa-support-hub
GOOGLE_CLOUD_SA_KEY: base64-encoded-service-account-key
LINE_CHANNEL_ACCESS_TOKEN: your-line-production-token
LINE_GROUP_ID: your-production-group-id
DISCORD_WEBHOOK_URL: your-discord-webhook
```

### 4. Monitoring Setup

#### Cloud Logging Setup

```bash
# Create log sink for errors
gcloud logging sinks create urawa-error-sink \
  bigquery.googleapis.com/projects/urawa-support-hub/datasets/logs \
  --log-filter='severity >= ERROR'
```

#### Health Check Monitoring

```bash
# Create uptime check
gcloud alpha monitoring uptime-checks create \
  --display-name="Urawa Scraper Health Check" \
  --http-check-path="/health" \
  --monitored-resource-type=gce_instance
```

## Troubleshooting

### Common Issues

#### Supabase Connection Issues

```bash
# Check if services are running
supabase status

# Restart services
supabase stop
supabase start

# Check logs
supabase logs -f
```

#### Google Cloud Permission Issues

```bash
# Check current authentication
gcloud auth list

# Check project configuration
gcloud config list

# Verify service account permissions
gcloud projects get-iam-policy urawa-support-hub
```

#### Cloud Run Deployment Issues

```bash
# Check deployment status
gcloud run services describe urawa-scraper --region asia-northeast1

# View logs
gcloud logs tail "projects/urawa-support-hub/logs/run.googleapis.com" --limit 50

# Test locally with Docker
docker build -t urawa-scraper .
docker run -p 8080:8080 --env-file .env urawa-scraper
```

#### Docker Build Issues

```bash
# Clean Docker cache
docker system prune -af

# Build with no cache
docker build --no-cache -t urawa-scraper .

# Check Dockerfile syntax
docker build --dry-run -t urawa-scraper .
```

### Performance Optimization

#### Deno Performance

```bash
# Check TypeScript compilation
deno check --quiet src/**/*.ts

# Optimize imports
deno info src/main.ts

# Cache dependencies
deno cache src/deps.ts
```

#### Cloud Run Performance

```bash
# Monitor resource usage
gcloud run services describe urawa-scraper \
  --region asia-northeast1 \
  --format="get(spec.template.spec.containers[0].resources)"

# View performance metrics
gcloud monitoring metrics list --filter="resource.type=cloud_run_revision"
```

#### Database Performance

```bash
# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM tickets WHERE match_date > NOW();

# Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats WHERE tablename = 'tickets';
```

## IDE Setup

### VS Code Configuration

**Recommended Extensions:**

- Deno (official)
- Supabase
- Google Cloud Code
- Docker
- TypeScript and JavaScript Language Features

**Settings (.vscode/settings.json):**

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "typescript.preferences.importModuleSpecifier": "relative",
  "docker.environment": {
    "GOOGLE_APPLICATION_CREDENTIALS": "./keys/service-account-key.json"
  }
}
```

### Debugging Setup

**Launch configuration (.vscode/launch.json):**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "deno",
      "args": ["test", "--inspect", "--allow-env", "--allow-net=127.0.0.1"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Cloud Run Local",
      "type": "node",
      "request": "launch",
      "program": "deno",
      "args": ["run", "--inspect", "--allow-all", "src/cloud-run/main.ts"],
      "console": "integratedTerminal",
      "env": {
        "PORT": "8080"
      }
    }
  ]
}
```

## Docker Configuration

### Dockerfile for Cloud Run

```dockerfile
# Multi-stage build for Cloud Run
FROM mcr.microsoft.com/playwright:v1.40.0-focal as base

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV PATH="/root/.deno/bin:$PATH"

WORKDIR /app

# Copy source code
COPY . .

# Cache dependencies
RUN deno cache src/deps.ts

# Expose port
EXPOSE 8080

# Run the application
CMD ["deno", "run", "--allow-all", "src/cloud-run/main.ts"]
```

### Docker Compose for Local Development

```yaml
version: '3.8'
services:
  urawa-scraper:
    build: .
    ports:
      - '8080:8080'
    environment:
      - SUPABASE_URL=http://host.docker.internal:54321
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - GOOGLE_APPLICATION_CREDENTIALS=/app/keys/service-account-key.json
    volumes:
      - ./keys:/app/keys:ro
    depends_on:
      - supabase
```

## Security Best Practices

### Local Development Security

```bash
# Create .gitignore for sensitive files
cat << EOF > .gitignore
.env
keys/
*.key
*.json
!package*.json
node_modules/
EOF

# Set proper permissions for service account key
chmod 600 keys/service-account-key.json
```

### Production Security

```bash
# Rotate service account keys regularly
gcloud iam service-accounts keys create new-key.json \
  --iam-account=urawa-scraper@urawa-support-hub.iam.gserviceaccount.com

# Delete old keys
gcloud iam service-accounts keys delete old-key-id \
  --iam-account=urawa-scraper@urawa-support-hub.iam.gserviceaccount.com
```

## Cost Monitoring

### GCP Cost Tracking

```bash
# Set up billing alerts
gcloud alpha billing budgets create \
  --billing-account=YOUR-BILLING-ACCOUNT-ID \
  --display-name="Urawa Support Hub Budget" \
  --budget-amount=10USD

# Monitor usage
gcloud billing accounts list
gcloud billing projects list --billing-account=YOUR-BILLING-ACCOUNT-ID
```

### Resource Usage Monitoring

```bash
# Cloud Run usage
gcloud run services describe urawa-scraper \
  --region asia-northeast1 \
  --format="table(metadata.name,status.traffic[0].percent,status.url)"

# Cloud Tasks usage
gcloud tasks queues describe notifications \
  --location=asia-northeast1
```
