# GitHub Secrets Setup Guide

This guide explains how to configure GitHub Secrets for the Urawa Support Hub project.

## Overview

GitHub Secrets are used to securely store sensitive information required for CI/CD pipelines and
GitHub Actions workflows. These secrets are encrypted and only accessible during workflow execution.

## Required Secrets

The following secrets must be configured in your GitHub repository:

### 1. Supabase Configuration

| Secret Name                 | Description                         | Required | Example Value               |
| --------------------------- | ----------------------------------- | -------- | --------------------------- |
| `SUPABASE_URL`              | Supabase project URL                | ✅       | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key (public)     | ✅       | `eyJhbGci...`               |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (private) | ✅       | `eyJhbGci...`               |

### 2. LINE Messaging API

| Secret Name                 | Description                     | Required | Example Value   |
| --------------------------- | ------------------------------- | -------- | --------------- |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot channel access token   | ✅       | `Bearer xxx...` |
| `LINE_GROUP_ID`             | Target LINE group ID (optional) | ⚪       | `Cxxxxx...`     |

### 3. Google Cloud Platform (Workload Identity)

| Secret Name       | Description                                    | Required | Example Value                                                                                                 |
| ----------------- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `GC_PROJECT_ID`   | GCP project identifier                         | ✅       | `urawa-support-hub`                                                                                           |
| `GC_REGION`       | Default GCP region                             | ✅       | `asia-northeast1`                                                                                             |
| `WIF_PROVIDER`    | Workload Identity Federation provider resource | ✅       | `projects/1081589382080/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider` |
| `GC_SA_CICD`      | CI/CD service account email                    | ✅       | `github-actions-cicd@urawa-support-hub.iam.gserviceaccount.com`                                               |
| `GC_SA_SCHEDULER` | Cloud Scheduler service account email          | ✅       | `cloud-scheduler-sa@urawa-support-hub.iam.gserviceaccount.com`                                                |
| `GC_SA_CLOUD_RUN` | Cloud Run service account email                | ✅       | `cloud-run-service@urawa-support-hub.iam.gserviceaccount.com`                                                 |
| `CLOUD_RUN_URL`   | Cloud Run service URL                          | ✅       | `https://urawa-support-hub-xxxxx-an.a.run.app`                                                                |

## Setup Instructions

### Step 1: Navigate to Repository Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Repository Secrets

For each required secret:

1. Click **New repository secret**
2. Enter the **Name** (exactly as shown in the tables above)
3. Enter the **Value**
4. Click **Add secret**

### Step 3: Obtain Secret Values

#### Supabase Credentials

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
   - service_role secret key → `SUPABASE_SERVICE_ROLE_KEY`

#### LINE Messaging API

1. Log in to [LINE Developers Console](https://developers.line.biz/)
2. Select your channel
3. Go to **Messaging API** tab
4. Copy **Channel access token** → `LINE_CHANNEL_ACCESS_TOKEN`

#### Google Cloud Platform (Workload Identity)

1. **Get Project Information**:
   - Go to [GCP Console](https://console.cloud.google.com/)
   - Select your project
   - Copy project ID → `GC_PROJECT_ID`
   - Set region → `GC_REGION` (e.g., `asia-northeast1`)

2. **Get Workload Identity Provider**:
   ```bash
   # List workload identity pools
   gcloud iam workload-identity-pools list --location=global

   # List providers in the pool
   gcloud iam workload-identity-pools providers list \
     --location=global \
     --workload-identity-pool=github-actions-pool

   # Copy the full provider resource name → WIF_PROVIDER
   ```

3. **Get Service Account Emails**:
   ```bash
   # List service accounts
   gcloud iam service-accounts list

   # Copy the emails for:
   # - CI/CD operations → GC_SA_CICD
   # - Cloud Scheduler → GC_SA_SCHEDULER
   # - Cloud Run service → GC_SA_CLOUD_RUN
   ```

4. **Get Cloud Run URL**:
   ```bash
   # List Cloud Run services
   gcloud run services list --region=asia-northeast1

   # Copy the service URL → CLOUD_RUN_URL
   ```

## Security Best Practices

1. **Never commit secrets** to your repository
2. **Rotate secrets regularly** (every 90 days recommended)
3. **Use least privilege principle** - only grant necessary permissions
4. **Monitor secret usage** through GitHub audit logs
5. **Document secret owners** and rotation schedule

## Verification

To verify your secrets are properly configured:

1. Check GitHub Actions workflows run successfully
2. Look for secret masking in workflow logs (secrets appear as `***`)
3. Test deployments in a staging environment first

## Troubleshooting

### Common Issues

1. **Workflow fails with "secret not found"**
   - Verify secret name matches exactly (case-sensitive)
   - Check secret is added to correct repository
   - Ensure workflow has permission to access secrets

2. **Workload Identity authentication errors**
   - Verify `WIF_PROVIDER` resource path is correct
   - Check service account email in `GC_SA_CICD`
   - Ensure GitHub repository is allowed in Workload Identity pool
   - Verify attribute mapping for repository and subject

3. **Artifact Registry permission denied**
   - Check service account has `artifactregistry.writer` role
   - Verify repository exists in Artifact Registry
   - Ensure project ID is correct in secrets
   - Check Docker authentication setup

4. **Cloud Run deployment failures**
   - Verify service account permissions for Cloud Run
   - Check memory and timeout configurations
   - Ensure container image is properly built and pushed
   - Review Cloud Run service account settings

5. **Cloud Scheduler issues**
   - Verify target Cloud Run service URL
   - Check OIDC service account configuration
   - Ensure scheduler service account has invoke permissions
   - Review cron expression and timezone settings

## Local Development

For local development, use `.env` file instead:

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

⚠️ **Important**: Never commit `.env` file to version control

## CI/CD Workflow Overview

The project uses two main GitHub Actions workflows:

### 1. Cloud Run Deployment (`.github/workflows/deploy.yml`)

**Trigger**: Push to `main` branch or `feature/#33_github-actions-cicd-pipeline`

**Process Flow**:

1. **Authentication**: Authenticate using Workload Identity Federation
2. **Docker Build**: Build application image with Playwright dependencies
3. **Registry Push**: Push image to Google Artifact Registry
4. **Cloud Run Deploy**: Deploy container to Cloud Run with specified configuration
5. **Cleanup**: Remove old images (keep latest 2)

**Key Configurations**:

- Memory: 2GB
- Timeout: 300 seconds
- Concurrency: 1
- Auto-scaling: 0-1 instances

### 2. Cloud Scheduler Deployment (`.github/workflows/deploy-scheduler.yml`)

**Trigger**: Changes to scheduler configuration files

**Process Flow**:

1. **Authentication**: Authenticate using Workload Identity Federation
2. **Scheduler Update**: Create or update Cloud Scheduler job
3. **Configuration**: Set up daily execution at 5:00 AM JST

**Scheduler Configuration**:

- Schedule: `0 5 * * *` (5:00 AM JST daily)
- Target: Cloud Run service `/api/collect-tickets` endpoint
- Authentication: OIDC with service account
- Retry: 3 attempts with exponential backoff

## GitHub Actions Usage

Secrets are automatically available in GitHub Actions:

```yaml
# Workload Identity authentication
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
    service_account: ${{ secrets.GC_SA_CICD }}

# Environment variables
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Support

For issues related to:

- **Supabase**: Check [Supabase Docs](https://supabase.com/docs)
- **LINE API**: Refer to [LINE Developers Docs](https://developers.line.biz/en/docs/)
- **GCP**: Visit [Google Cloud Docs](https://cloud.google.com/docs)
