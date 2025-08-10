# Technology Selection Document

## Technology Stack Overview

### Runtime Environment
- **Deno + TypeScript**: Modern runtime with built-in TypeScript support
- **Reason**: Type safety, modern JavaScript features, secure by default

### Database
- **Supabase PostgreSQL**: Cloud-native PostgreSQL with REST API
- **Reason**: Free tier availability, edge function integration, real-time capabilities

### Edge Functions
- **Supabase Edge Functions**: Serverless compute on the edge
- **Reason**: Global distribution, automatic scaling, integrated with database

### Web Scraping
- **Playwright**: Modern browser automation library
- **Reason**: Reliable scraping, JavaScript execution support, multiple browser support

### Notifications
- **LINE Messaging API**: User notifications
- **Discord Webhook**: Developer/system monitoring
- **Reason**: Target user base preferences, reliable delivery

### Scheduling
- **pg_cron**: PostgreSQL extension for scheduled tasks
- **Reason**: Database-native scheduling, reliable execution

### Architecture Pattern
- **Clean Architecture**: Domain-driven design with clear separation of concerns
- **Repository Pattern**: Data access abstraction
- **Reason**: Testability, maintainability, external service independence

## Implementation Status

### Completed ✅
- Domain Layer: Ticket, NotificationHistory entities
- Infrastructure Layer: Repository implementations
- Configuration-driven design patterns
- Comprehensive test suite (45 test cases)
- CI/CD optimization

### In Progress 🚧
- Edge Functions implementation
- Scraping service development

### Planned 📋
- Production deployment
- Monitoring dashboard
- Performance optimization