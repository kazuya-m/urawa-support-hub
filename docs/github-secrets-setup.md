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

### 3. Discord Configuration

| Secret Name           | Description                          | Required | Example Value                          |
| --------------------- | ------------------------------------ | -------- | -------------------------------------- |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for error alerts | ✅       | `https://discord.com/api/webhooks/...` |
| `DISCORD_CHANNEL_ID`  | Discord channel ID (optional)        | ⚪       | `123456789012345678`                   |

### 4. Google Cloud Platform

| Secret Name               | Description                       | Required | Example Value            |
| ------------------------- | --------------------------------- | -------- | ------------------------ |
| `GCP_PROJECT_ID`          | GCP project identifier            | ✅       | `urawa-support-hub-prod` |
| `GCP_SERVICE_ACCOUNT_KEY` | Service account JSON key (base64) | ✅       | Base64 encoded JSON      |
| `GCP_REGION`              | Default GCP region                | ⚪       | `asia-northeast1`        |

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

#### Discord Webhook

1. Open Discord and go to your server
2. Right-click on the channel → **Edit Channel**
3. Go to **Integrations** → **Webhooks**
4. Create or select a webhook
5. Copy **Webhook URL** → `DISCORD_WEBHOOK_URL`

#### Google Cloud Platform

1. Go to [GCP Console](https://console.cloud.google.com/)
2. Select your project
3. Copy project ID from the dropdown → `GCP_PROJECT_ID`

For service account:

1. Go to **IAM & Admin** → **Service Accounts**
2. Create or select a service account
3. Click **Keys** → **Add Key** → **Create new key**
4. Choose JSON format
5. Base64 encode the JSON file:
   ```bash
   base64 -i service-account-key.json | tr -d '\n' > encoded-key.txt
   ```
6. Copy the content → `GCP_SERVICE_ACCOUNT_KEY`

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

2. **Authentication errors**
   - Verify secret values are complete (no truncation)
   - Check credentials haven't expired
   - Ensure proper formatting (no extra spaces/newlines)

3. **Base64 encoding issues (GCP)**
   - Use proper base64 encoding without line breaks
   - Verify JSON is valid before encoding

## Local Development

For local development, use `.env` file instead:

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

⚠️ **Important**: Never commit `.env` file to version control

## GitHub Actions Usage

Secrets are automatically available in GitHub Actions:

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

## Support

For issues related to:

- **Supabase**: Check [Supabase Docs](https://supabase.com/docs)
- **LINE API**: Refer to [LINE Developers Docs](https://developers.line.biz/en/docs/)
- **Discord**: See [Discord Developer Portal](https://discord.com/developers/docs)
- **GCP**: Visit [Google Cloud Docs](https://cloud.google.com/docs)
