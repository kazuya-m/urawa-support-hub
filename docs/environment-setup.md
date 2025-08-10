# Environment Setup Guide

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

3. **Git**
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

### 2. Supabase Local Environment

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

### 3. Environment Variables

Create `.env` file in project root:

```bash
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key-from-supabase-status
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase-status

# LINE Messaging API (Production)
LINE_CHANNEL_ACCESS_TOKEN=your-line-token
LINE_GROUP_ID=your-line-group-id

# Discord Webhook (Optional)
DISCORD_WEBHOOK_URL=your-discord-webhook-url

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
```

### 4. Database Schema Setup

```bash
# Apply database migrations
supabase db reset

# Verify schema
supabase db diff
```

## Development Workflow

### Daily Development Commands

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

### Edge Functions Development

```bash
# Serve Edge Functions locally
supabase functions serve

# Test specific function
curl -X POST 'http://127.0.0.1:54321/functions/v1/daily-check' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json'
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

## Testing Setup

### Test Environment Configuration

```bash
# Run unit tests only
deno test src/ --coverage=coverage

# Run integration tests
deno test tests/integration/ --allow-env --allow-net=127.0.0.1

# Run specific test file
deno test src/domain/entities/__tests__/Ticket.test.ts

# Watch mode for development
deno test --watch src/
```

### Test Permissions

**Required minimal permissions:**
```bash
--allow-env          # Environment variables access
--allow-net=127.0.0.1 # Local Supabase connection
```

**Prohibited permissions:**
```bash
--allow-all          # Too permissive, security risk
--allow-net          # Too broad, should be specific
```

## Production Environment

### Supabase Cloud Setup

1. **Create Supabase Project**
   - Visit [supabase.com](https://supabase.com)
   - Create new project
   - Note project URL and API keys

2. **Deploy Database Schema**
   ```bash
   # Link to remote project
   supabase link --project-ref your-project-id
   
   # Push local migrations
   supabase db push
   ```

3. **Deploy Edge Functions**
   ```bash
   # Deploy all functions
   supabase functions deploy
   
   # Deploy specific function
   supabase functions deploy daily-check
   ```

### Environment Variables (Production)

**GitHub Secrets Configuration:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
LINE_CHANNEL_ACCESS_TOKEN=your-line-production-token
LINE_GROUP_ID=your-production-group-id
DISCORD_WEBHOOK_URL=your-discord-webhook
```

### Monitoring Setup

```bash
# Enable pg_cron extension
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

# Schedule daily checks
SELECT cron.schedule(
  'daily-ticket-check',
  '0 12 * * *',  -- Daily at 12:00 UTC
  'SELECT net.http_post(url := ''https://your-project.supabase.co/functions/v1/daily-check'')'
);
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
supabase logs
```

#### Permission Errors
```bash
# Ensure minimum required permissions
deno test --allow-env --allow-net=127.0.0.1

# Check file permissions
ls -la deno.json
```

#### Database Schema Issues
```bash
# Reset to clean state
supabase db reset

# Check migration status
supabase migration list

# Manually apply migrations
supabase migration up
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
- TypeScript and JavaScript Language Features

**Settings (.vscode/settings.json):**
```json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "typescript.preferences.importModuleSpecifier": "relative"
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
    }
  ]
}
```