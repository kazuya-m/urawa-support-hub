# GCP Service Account Minimum Permissions

This document defines the minimum required permissions for GCP service accounts used in the Urawa
Support Hub project.

## Service Account Strategy

### 1. Scraping Service Account (for Cloud Run)

**Purpose**: Execute Playwright scraping operations **Resources**: Cloud Run service execution

**Required Permissions**:

```yaml
# Cloud Tasks (to trigger notifications)
- cloudtasks.queues.get
- cloudtasks.tasks.create
- cloudtasks.tasks.get

# Basic Cloud Run service info (for health checks only)
- run.services.get (on own service only)
```

**❌ NOT NEEDED**:

- `storage.*` permissions - Data is stored in Supabase PostgreSQL, not Cloud Storage
- `run.services.list` - Service only needs info about itself
- `run.executions.*` - Not required for basic scraping operations

**Recommended IAM Roles**:

- `roles/cloudtasks.enqueuer` (for creating notification tasks)
- Custom role with minimal Cloud Run permissions (see implementation below)

**❌ NOT NEEDED**: `roles/run.invoker` - scraping service doesn't invoke other services

### 2. Notification Service Account (for Edge Functions)

**Purpose**: Send LINE/Discord notifications via Supabase Edge Functions **Resources**: Supabase
Edge Function invocation

**Required Permissions**:

```yaml
# Basic compute permissions for Edge Function execution
- No specific GCP permissions required (handled by Supabase)
```

**Environment Variables Required**:

- `LINE_CHANNEL_ACCESS_TOKEN`
- `DISCORD_WEBHOOK_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Scheduler Service Account (for Cloud Scheduler)

**Purpose**: Trigger daily scraping jobs **Resources**: Cloud Scheduler, Cloud Run invocation

**Required Permissions**:

```yaml
# Cloud Run invocation (ONLY for specific scraping service)
- run.services.get (on specific service only)
- run.routes.invoke (on specific service only)

# Cloud Scheduler management
- cloudscheduler.jobs.get
- cloudscheduler.jobs.run
```

**Recommended IAM Roles**:

- `roles/run.invoker` (⚠️ ONLY on specific scraping service, NOT project-wide)
- `roles/cloudscheduler.jobRunner`

## Security Best Practices

### 1. Principle of Least Privilege

- Grant only the minimum permissions required for each service
- Use predefined IAM roles when appropriate, prefer custom roles for fine-grained control
- Avoid broad permissions like `roles/editor` or `roles/owner`
- **Service-specific permissions**: Grant `roles/run.invoker` only on specific services, never
  project-wide
- **Custom roles**: Create custom roles when predefined roles grant excessive permissions

### 2. Service Account Rotation

- Rotate service account keys every 90 days
- Use Workload Identity Federation when possible
- Monitor service account usage via Cloud Audit Logs

### 3. Environment-Specific Accounts

```bash
# Development environment
urawa-support-dev-scraper@project-dev.iam.gserviceaccount.com

# Production environment  
urawa-support-prod-scraper@project-prod.iam.gserviceaccount.com
```

### 4. Key Management

- Store service account keys as environment variables
- Never commit keys to version control
- Use Google Secret Manager for production secrets

## Implementation Commands

### Create Service Accounts

```bash
# Scraping service account
gcloud iam service-accounts create urawa-scraper \
  --display-name="Urawa Support Scraper" \
  --description="Service account for Playwright scraping operations"

# Scheduler service account
gcloud iam service-accounts create urawa-scheduler \
  --display-name="Urawa Support Scheduler" \
  --description="Service account for Cloud Scheduler operations"
```

### Grant Minimum Permissions

```bash
# 1. Create custom role for scraper with minimal permissions
gcloud iam roles create urawaScrapingServiceRole \
  --project=PROJECT_ID \
  --title="Urawa Scraping Service Role" \
  --description="Minimal permissions for Cloud Run scraping service" \
  --permissions="run.services.get,cloudtasks.queues.get,cloudtasks.tasks.create,cloudtasks.tasks.get"

# 2. Grant custom role to scraper (NO run.invoker needed)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:urawa-scraper@PROJECT_ID.iam.gserviceaccount.com" \
  --role="projects/PROJECT_ID/roles/urawaScrapingServiceRole"

# 3. Grant Cloud Scheduler job runner role to scheduler
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:urawa-scheduler@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudscheduler.jobRunner"

# 4. Grant run.invoker role to scheduler ONLY on specific scraping service
gcloud run services add-iam-policy-binding scraping-service \
  --member="serviceAccount:urawa-scheduler@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker" \
  --region=asia-northeast1
```

### Generate and Download Keys

```bash
# Generate key for scraper service account
gcloud iam service-accounts keys create scraper-key.json \
  --iam-account=urawa-scraper@PROJECT_ID.iam.gserviceaccount.com

# Generate key for scheduler service account
gcloud iam service-accounts keys create scheduler-key.json \
  --iam-account=urawa-scheduler@PROJECT_ID.iam.gserviceaccount.com
```

## Monitoring and Auditing

### 1. Enable Audit Logs

```bash
# Enable audit logs for service account usage
gcloud logging sinks create service-account-audit \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/security_audit \
  --log-filter='protoPayload.serviceName="iam.googleapis.com"'
```

### 2. Regular Permission Reviews

- Review service account permissions monthly
- Remove unused permissions immediately
- Document permission changes in this file

## Environment Variable Security

All service account keys and sensitive configuration should be stored as environment variables:

```bash
# GCP service account keys (base64 encoded JSON)
GOOGLE_CLOUD_CREDENTIALS_SCRAPER="base64-encoded-key"
GOOGLE_CLOUD_CREDENTIALS_SCHEDULER="base64-encoded-key"

# Project configuration
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_REGION="asia-northeast1"
```
