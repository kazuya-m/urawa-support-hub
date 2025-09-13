# Testing Guidelines

## Overview

This document provides comprehensive testing strategies and patterns for the urawa-support-hub
project, specifically designed for **small-scale projects** using **direct import strategy** with
Clean Architecture principles.

## 🎯 Testing Philosophy

### Small-Scale Project Strategy

- **Direct Method Mocking**: Use `instance['dependency']` pattern for precise test isolation
- **Minimal Infrastructure**: Avoid complex dependency injection frameworks
- **Practical Patterns**: Focus on maintainable, reliable test patterns

### Test Isolation Principles

- **Network Isolation**: All unit tests must avoid actual network calls
- **Database Isolation**: Use mock Supabase clients, never connect to real databases
- **Resource Management**: Ensure all mocks are properly restored after each test

## 📁 Test File Organization

### Directory Structure

```
src/application/usecases/
├── NotificationUseCase.ts
└── __tests__/
    └── NotificationUseCase.test.ts
```

### Naming Conventions

- **Test files**: `{TargetFileName}.test.ts`
- **Test placement**: `__tests__/` directory at the same level as the target file
- **Test descriptions**: Use clear, behavior-focused descriptions

## 🧪 Core Testing Patterns

### 1. Direct Method Mocking Pattern

**✅ Recommended Approach for Small-Scale Projects**

```typescript
import { assertEquals } from 'std/assert/mod.ts';
import { returnsNext, stub } from 'std/testing/mock.ts';
import { NotificationUseCase } from '@/application/usecases/NotificationUseCase.ts';
import { NOTIFICATION_TYPES } from '@/domain/entities/NotificationTypes.ts';

// Test environment setup (required for Supabase client initialization)
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('NotificationUseCase should call NotificationService.processScheduledNotification', async () => {
  const useCase = new NotificationUseCase();

  // Direct method mocking with controlled return value
  const mockMethod = stub(
    useCase['notificationService'], // Access internal dependency
    'processScheduledNotification', // Target method
    returnsNext([Promise.resolve()]), // Controlled response
  );

  try {
    const input = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    await useCase.execute(input);

    // Verify mock was called correctly
    assertEquals(mockMethod.calls.length, 1);
    assertEquals(mockMethod.calls[0].args[0], input);
  } finally {
    mockMethod.restore(); // Essential: Always restore mocks
  }
});
```

### 2. Error Handling Testing

```typescript
Deno.test('NotificationUseCase should handle service errors properly', async () => {
  const useCase = new NotificationUseCase();
  const testError = new Error('Service operation failed');

  // Mock that throws an error
  const mockMethod = stub(
    useCase['notificationService'],
    'processScheduledNotification',
    returnsNext([Promise.reject(testError)]),
  );

  try {
    const input = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    let caughtError: Error | null = null;
    try {
      await useCase.execute(input);
    } catch (error) {
      caughtError = error as Error;
    }

    // Verify error handling
    assertEquals(caughtError?.message.includes('Service operation failed'), true);
    assertEquals(mockMethod.calls.length, 1);
  } finally {
    mockMethod.restore();
  }
});
```

### 3. Multiple Mock Management

```typescript
Deno.test('NotificationUseCase should log execution time', async () => {
  const useCase = new NotificationUseCase();

  // Multiple mocks for comprehensive testing
  const consoleLogStub = stub(console, 'log');
  const mockMethod = stub(
    useCase['notificationService'],
    'processScheduledNotification',
    returnsNext([Promise.resolve()]),
  );

  try {
    const input = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    await useCase.execute(input);

    // Verify both service call and logging
    assertEquals(mockMethod.calls.length, 1);
    assertEquals(consoleLogStub.calls.length, 1);
    assertEquals(consoleLogStub.calls[0].args[0], 'Scheduled notification completed successfully:');
  } finally {
    // Restore all mocks in reverse order
    consoleLogStub.restore();
    mockMethod.restore();
  }
});
```

## 🛡️ Environment Setup

### Required Environment Variables

All unit tests require minimal Supabase configuration to prevent initialization errors:

```typescript
// Required at the top of every test file
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
```

### Test Permissions

**✅ Minimal Required Permissions**:

```bash
deno test --allow-env --allow-net=127.0.0.1
```

**❌ Avoid Excessive Permissions**:

```bash
deno test --allow-all  # Too permissive
deno test --allow-net   # Allows external network access
```

## 🔄 Mock Cleanup Strategies

### 1. try-finally Pattern (Current Best Practice)

```typescript
Deno.test('example test', async () => {
  const mockMethod = stub(obj, 'method', returnsNext([result]));

  try {
    // Test execution
    await someOperation();
    // Assertions
    assertEquals(mockMethod.calls.length, 1);
  } finally {
    mockMethod.restore(); // Always executed
  }
});
```

### 2. Future: using Keyword (When Available)

```typescript
// 🔮 Future implementation when Deno STD supports Symbol.dispose
Deno.test('future disposable test', async () => {
  // Automatic resource management (not yet supported)
  using mockMethod = stub(obj, 'method', returnsNext([result]));

  await someOperation();
  assertEquals(mockMethod.calls.length, 1);
  // mockMethod automatically restored at end of scope
});
```

## 🎭 Mock Implementation Patterns

### Interface-Based Mock Strategy

For dependency injection scenarios, create type-safe mocks using interface implementations:

#### ✅ Recommended Interface Mock Pattern

```typescript
// 1. Define the interface
export interface IBrowserManager {
  launch(timeout: number): Promise<void>;
  createPage(defaultTimeout: number): Promise<Page>;
  navigateToPage(page: Page, url: string): Promise<void>;
  close(): Promise<void>;
}

// 2. Create interface-based mock
export class MockBrowserManager implements IBrowserManager {
  private mockPage: Partial<Page> | null = null;

  async launch(_timeout: number): Promise<void> {
    // Simple mock: do nothing
  }

  async createPage(_defaultTimeout: number): Promise<Page> {
    if (!this.mockPage) {
      throw new Error('Mock page not set. Call setMockPage() first.');
    }
    return this.mockPage as Page;
  }

  async navigateToPage(_page: Page, _url: string): Promise<void> {
    // Simple mock: do nothing
  }

  async close(): Promise<void> {
    // Simple mock: do nothing
  }

  // Test helper methods
  setMockPage(page: Partial<Page>): void {
    this.mockPage = page;
  }
}

// 3. Use in tests
Deno.test('JLeagueScrapingService with DI Mock', async () => {
  const mockBrowserManager = new MockBrowserManager();
  const mockPage = {
    $: () => Promise.resolve(null),
    $$: () => Promise.resolve([]),
    goto: () => Promise.resolve(null),
  } as Partial<Page>;

  mockBrowserManager.setMockPage(mockPage);

  const service = new JLeagueScrapingService(
    mockExtractor,
    mockParser,
    mockBrowserManager, // Type-safe interface injection
  );

  const tickets = await service.collectTickets();
  assertEquals(tickets.length, 0);
});
```

#### ❌ Anti-patterns to Avoid

```typescript
// Bad: any type Mock
const mockBrowserManager = {} as any;

// Bad: Inheritance-based Mock
export class MockBrowserManager extends BrowserManager {
  override async launch() {} // Complex override pattern
}

// Bad: Incomplete interface implementation
const mockBrowserManager = {
  launch: () => Promise.resolve(),
  // Missing other required methods
} as IBrowserManager;
```

### DI Container Testing Pattern

```typescript
export class TestDIContainer {
  static createMockService(): JLeagueScrapingService {
    const mockExtractor = new MockJLeagueDataExtractor();
    const mockParser = new JLeagueDataParser();
    const mockBrowserManager = new MockBrowserManager();

    return new JLeagueScrapingService(
      mockExtractor,
      mockParser,
      mockBrowserManager,
    );
  }
}

// Usage in tests
Deno.test('Service integration with mocks', async () => {
  const service = TestDIContainer.createMockService();
  // Test with fully mocked dependencies
});
```

### Benefits of Interface-Based Mocks

1. **Type Safety**: Full TypeScript type checking without `any`
2. **Contract Compliance**: Mocks must implement full interface
3. **Refactoring Safety**: Interface changes break mocks at compile time
4. **Clarity**: Explicit mock behavior for each method
5. **Maintainability**: Simple, predictable mock implementations

## 📊 Testing Strategy Overview

### Testing Layers Architecture

Our testing strategy implements a **two-tier approach** that balances speed and reliability:

#### 🔸 Unit Tests (`src/**/__tests__/*.test.ts`)

- **Purpose**: Business logic validation and component isolation
- **Database**: Mock Supabase clients (`createMockSupabaseClient`)
- **Network**: No external connections
- **Speed**: Fast execution (< 2 seconds)
- **Command**: `deno test --allow-env src/`

#### 🔸 Integration Tests (`tests/integration/*.test.ts`)

- **Purpose**: Database operations and external service validation
- **Database**: Real Supabase connections (`createTestSupabaseClient`)
- **Network**: Actual database CRUD operations
- **Speed**: Slower execution with cleanup
- **Command**: `deno test --allow-env --allow-net=127.0.0.1 tests/integration/`

### Unit Test Patterns by Layer

#### UseCase Layer Testing

- **Target**: Application business logic
- **Mock**: Infrastructure layer (Services, Repositories)
- **Focus**: Workflow orchestration, error handling

```typescript
const mockService = stub(useCase['infrastructureService'], 'method');
```

#### Controller Layer Testing

- **Target**: HTTP request/response handling
- **Mock**: Application layer (UseCases)
- **Focus**: Input validation, response formatting

```typescript
const mockUseCase = stub(controller['useCase'], 'execute');
```

#### Service Layer Testing

- **Target**: External system integration
- **Mock**: Repositories, external APIs
- **Focus**: Data transformation, API calls

```typescript
const mockRepository = stub(service['repository'], 'save');
```

## 🔗 Integration Testing Patterns

### 1. Repository Integration Testing

Integration tests verify actual database operations and constraints:

```typescript
// tests/integration/repository.test.ts
import { assertEquals } from 'jsr:@std/assert';
import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import { cleanupTestData, createTestSupabaseClient } from '@/tests/utils/test-supabase.ts';

const supabase = createTestSupabaseClient(); // Real Supabase connection
const ticketRepo = new TicketRepositoryImpl(supabase);

Deno.test('TicketRepository - save and findById', async () => {
  const testTicket = createTestTicket();

  try {
    // Actual database operations
    await ticketRepo.save(testTicket);
    const result = await ticketRepo.findById(testTicket.id);

    // Verify data persistence
    assertEquals(result?.id, testTicket.id);
    assertEquals(result?.matchName, testTicket.matchName);
  } finally {
    // Guaranteed cleanup
    await cleanupTestData(supabase, 'tickets', testTicket.id);
  }
});
```

### 2. Database Constraint Testing

```typescript
Deno.test('TicketRepository - unique constraint validation', async () => {
  const testTicket = createTestTicket();

  try {
    await ticketRepo.save(testTicket);

    // Test database constraint enforcement
    await assertRejects(
      () => ticketRepo.save(testTicket), // Duplicate ID
      RepositoryError,
      'Unique constraint violation',
    );
  } finally {
    await cleanupTestData(supabase, 'tickets', testTicket.id);
  }
});
```

### 3. Data Cleanup Strategies

#### Individual Record Cleanup

```typescript
// For single record tests
async function cleanupTicket(ticketId: string) {
  await cleanupTestData(supabase, 'tickets', ticketId);
}

// Usage in tests
try {
  await ticketRepo.save(testTicket);
  // Test operations
} finally {
  await cleanupTicket(testTicket.id); // Always executed
}
```

#### Table-wide Cleanup

```typescript
// For comprehensive system tests
Deno.test('Notification Integration Tests', async (t) => {
  const testTableName = 'notifications';

  // Clean slate before tests
  await cleanupTestTable(supabase, testTableName);

  await t.step('should complete full workflow', async () => {
    // System-wide test operations
  });

  // Clean slate after tests
  await cleanupTestTable(supabase, testTableName);
});
```

### 4. Test Environment Setup

Integration tests require actual Supabase configuration:

```typescript
// tests/utils/test-supabase.ts
export function createTestSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://127.0.0.1:54321';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'default-test-key';

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false, // Prevent test interference
      persistSession: false, // Avoid session leaks
    },
  });
}
```

## 🚀 Command Usage Guide

### Development Workflow

#### Fast Unit Testing (Development)

```bash
# Quick feedback during development
deno test --allow-env src/
# ✅ 66 tests in ~1 second
# ✅ No network dependencies
# ✅ Mock-based isolation
```

#### Complete Test Suite (Pre-commit)

```bash
# Full validation before commits
deno test --allow-env --allow-net=127.0.0.1
# ✅ Unit tests (fast)
# ✅ Integration tests (requires Supabase)
# ✅ End-to-end validation
```

#### Integration Tests Only (Database Validation)

```bash
# Focus on database operations
deno test --allow-env --allow-net=127.0.0.1 tests/integration/
# ✅ Actual CRUD operations
# ✅ Constraint validation
# ✅ Data cleanup verification
```

### CI/CD Pipeline Usage

```yaml
# Example GitHub Actions configuration
- name: Run Unit Tests
  run: deno test --allow-env src/

- name: Run Integration Tests
  run: deno test --allow-env --allow-net=127.0.0.1 tests/integration/
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Permission Strategy

#### Unit Tests: Minimal Permissions

```bash
--allow-env  # Environment variables only
# ❌ No network access
# ❌ No file system beyond temp
```

#### Integration Tests: Controlled Network Access

```bash
--allow-env --allow-net=127.0.0.1  # Local Supabase only
# ✅ Database operations
# ❌ External network calls
```

## ⚠️ Common Pitfalls and Solutions

### Problem: Actual Network Calls in Unit Tests

**❌ Problem**:

```typescript
// Test makes real Supabase calls
Deno.test('bad test', async () => {
  const useCase = new NotificationUseCase();
  await useCase.execute(input); // Real service calls!
});
```

**✅ Solution**:

```typescript
Deno.test('good test', async () => {
  const useCase = new NotificationUseCase();

  const mockMethod = stub(
    useCase['notificationService'],
    'processScheduledNotification',
    returnsNext([Promise.resolve()]),
  );

  try {
    await useCase.execute(input);
    assertEquals(mockMethod.calls.length, 1);
  } finally {
    mockMethod.restore();
  }
});
```

### Problem: Mock Restoration Forgotten

**❌ Problem**:

```typescript
Deno.test('bad test', async () => {
  const mock = stub(obj, 'method');
  // No restore() - affects other tests!
});
```

**✅ Solution**:

```typescript
Deno.test('good test', async () => {
  const mock = stub(obj, 'method');
  try {
    // Test execution
  } finally {
    mock.restore(); // Always restore
  }
});
```

### Problem: Environment Variable Dependencies

**❌ Problem**:

```typescript
// Missing environment setup causes Supabase initialization errors
Deno.test('failing test', async () => {
  const useCase = new NotificationUseCase(); // Error: Missing SUPABASE_URL
});
```

**✅ Solution**:

```typescript
// Set up test environment first
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('working test', async () => {
  const useCase = new NotificationUseCase(); // Successful initialization
});
```

## 🚀 Best Practices Summary

### DO ✅

- Use `try-finally` for guaranteed mock cleanup
- Set up minimal test environment variables
- Mock at the appropriate architectural layer
- Use descriptive test names and clear assertions
- Test both success and error scenarios
- Run tests with minimal permissions

### DON'T ❌

- Make real network or database calls in unit tests
- Forget to restore mocks after tests
- Use excessive test permissions (`--allow-all`)
- Mix integration concerns into unit tests
- Create overly complex mock setups

## 🔗 References

- [Clean Architecture Guide](./clean-architecture-guide.md) - Architectural principles and layer
  responsibilities
- [System Architecture](./system-architecture.md) - Overall system design patterns
- [Deno Testing Documentation](https://docs.deno.com/runtime/manual/basics/testing/) - Official Deno
  testing guide

## 📝 Changelog

- **2025-01-30**: Initial version with direct method mocking patterns
- **2025-01-30**: Added comprehensive error handling and cleanup strategies
- **2025-01-30**: Added Integration Testing patterns and two-tier testing strategy documentation
