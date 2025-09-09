# Environment Variable Management Rules

This document defines the secure management of environment variables and sensitive configuration for
the Urawa Support Hub project.

## Security Classification

### 1. Public Configuration (Safe to commit)

**Examples**: Feature flags, API endpoints, non-sensitive defaults

```bash
# ✅ Safe - can be in .env.example
PUBLIC_API_BASE_URL="https://api.example.com"
SCRAPING_INTERVAL_HOURS=24
LOG_LEVEL="info"
DEFAULT_TIMEZONE="Asia/Tokyo"
```

### 2. Sensitive Configuration (Never commit)

**Examples**: API keys, tokens, credentials, secrets

```bash
# ❌ Never commit - keep in .env only
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
LINE_CHANNEL_ACCESS_TOKEN="abcd1234..."
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
GOOGLE_CLOUD_CREDENTIALS="base64-encoded-json"
```

### 3. Environment-Specific Configuration

**Examples**: Database URLs, service endpoints that vary by environment

```bash
# Development
SUPABASE_URL="https://dev-project.supabase.co"
GOOGLE_CLOUD_PROJECT_ID="urawa-support-dev"

# Production
SUPABASE_URL="https://prod-project.supabase.co"
GOOGLE_CLOUD_PROJECT_ID="urawa-support-prod"
```

## File Organization

### 1. File Structure

```
├── .env.example          # Public template with dummy values
├── .env                  # Local development (never commit)
├── .env.local           # Personal overrides (never commit)
├── .env.development     # Development environment (never commit)
├── .env.staging         # Staging environment (never commit)
├── .env.production      # Production environment (never commit)
└── .gitignore           # Excludes all sensitive .env files
```

### 2. .env.example Template

```bash
# Supabase Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="eyJ_your_anon_key_here"
SUPABASE_SERVICE_ROLE_KEY="eyJ_your_service_role_key_here"

# Google Cloud Configuration  
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_REGION="asia-northeast1"
GOOGLE_CLOUD_CREDENTIALS="base64-encoded-service-account-json"

# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN="your_line_channel_access_token"
LINE_CHANNEL_SECRET="your_line_channel_secret"

# Discord Webhook
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/your/webhook/url"

# Application Configuration
LOG_LEVEL="info"
SCRAPING_INTERVAL_HOURS="24"
DEFAULT_TIMEZONE="Asia/Tokyo"
NODE_ENV="development"

# Optional: Development overrides
# DATABASE_LOG_LEVEL="debug"
# SCRAPING_TEST_MODE="true"
```

### 3. Environment Loading Priority

1. `.env.local` (highest priority - personal overrides)
2. `.env.${NODE_ENV}` (environment-specific)
3. `.env` (development defaults)
4. `.env.example` (not loaded - template only)

## Secure Storage Methods

### 1. Local Development

**Method**: `.env` files with proper .gitignore

```bash
# Store in .env file
echo "SUPABASE_SERVICE_ROLE_KEY=eyJ..." >> .env

# Verify .gitignore excludes it
grep -n "\.env" .gitignore
```

### 2. Cloud Run Environment Variables

**Method**: Set via gcloud command or Cloud Console

```bash
# Set environment variables for Cloud Run
gcloud run services update urawa-support-hub \
  --set-env-vars="SUPABASE_URL=https://...,SUPABASE_SERVICE_ROLE_KEY=eyJ..." \
  --region=asia-northeast1
```

### 3. Supabase Edge Functions

**Method**: Supabase secrets management

```bash
# Set secrets for Edge Functions
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN="your_token"
supabase secrets set DISCORD_WEBHOOK_URL="your_webhook"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your_key"
```

### 4. Google Secret Manager (Recommended for Production)

**Method**: Store sensitive values in Google Secret Manager

```bash
# Store secret in Secret Manager
gcloud secrets create line-channel-token --data-file=token.txt

# Grant access ONLY to services that actually need secrets
# ❌ DON'T grant to scraper - it gets vars via Cloud Run environment
# ✅ ONLY grant to services that dynamically fetch secrets

# Example: If scheduler needs to fetch secrets dynamically
# gcloud secrets add-iam-policy-binding line-channel-token \
#   --member="serviceAccount:urawa-scheduler@project.iam.gserviceaccount.com" \
#   --role="roles/secretmanager.secretAccessor"

# ⚠️ PRINCIPLE: Grant Secret Manager access only when environment variables are insufficient

# Access from Cloud Run
export LINE_CHANNEL_ACCESS_TOKEN=$(gcloud secrets versions access latest --secret="line-channel-token")
```

## Validation and Testing

### 1. Environment Validation Function

```typescript
// src/shared/utils/validateEnvironment.ts
export function validateEnvironment(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'DISCORD_WEBHOOK_URL',
    'GOOGLE_CLOUD_PROJECT_ID',
  ];

  const missing = required.filter((key) => !Deno.env.get(key));

  if (missing.length > 0) {
    // ❌ SECURITY: Never log actual variable names that might reveal system structure
    throw new Error(
      `Missing ${missing.length} required environment variables. Check .env.example.`,
    );
  }

  // ✅ SECURITY: Log only success without revealing variable names
  console.log('✅ All required environment variables are present.');
}

// Validate on application startup
validateEnvironment();
```

### 2. Development Setup Verification

```bash
# Check environment setup
deno run --allow-env scripts/check-environment.ts

# Test Supabase connection
deno run --allow-env --allow-net scripts/test-supabase.ts

# Test external services
deno run --allow-env --allow-net scripts/test-external-services.ts
```

## Security Best Practices

### 1. Rotation Schedule

- **LINE tokens**: Rotate every 90 days
- **Discord webhooks**: Regenerate every 90 days
- **Supabase keys**: Rotate every 90 days
- **GCP service accounts**: Rotate every 90 days
- **Database passwords**: Rotate every 30 days (if applicable)

### 2. Access Logging

```bash
# Monitor environment variable access
export AUDIT_ENV_ACCESS=true

# Log when sensitive variables are accessed
function auditEnvAccess() {
  echo "$(date): Environment variable accessed: $1" >> .env-access.log
}
```

### 3. Development Team Guidelines

- **Never commit** `.env` files with real values
- **Never share** environment variables via chat/email
- **Always use** `.env.example` for onboarding
- **Regularly rotate** development keys
- **Report compromised** keys immediately

### 4. CI/CD Security

```yaml
# GitHub Actions example
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
```

## Troubleshooting

### 1. Common Issues

**Missing environment variables**:

```bash
# Check if variable is set
echo $SUPABASE_URL

# List all environment variables
env | grep SUPABASE

# Reload environment file
source .env
```

**Permission denied errors**:

```bash
# Check file permissions
ls -la .env

# Fix permissions (readable by owner only)
chmod 600 .env
```

### 2. Emergency Procedures

**Compromised keys**:

1. Immediately rotate affected keys
2. Update all environments with new keys
3. Review access logs for unauthorized usage
4. Update .env.example if dummy values were compromised

**Service outages due to env vars**:

1. Check Cloud Run environment variables
2. Verify Supabase secrets are set
3. Test connectivity with new keys
4. Monitor error logs for auth failures

## Implementation Checklist

### Setup New Environment

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in real values for all variables
- [ ] Verify `.env` is in `.gitignore`
- [ ] Run environment validation script
- [ ] Test all external service connections
- [ ] Document any new variables in `.env.example`

### Rotate Credentials

- [ ] Generate new credentials from service providers
- [ ] Update local `.env` file
- [ ] Update Cloud Run environment variables
- [ ] Update Supabase secrets
- [ ] Test all services with new credentials
- [ ] Revoke old credentials
- [ ] Update team documentation
