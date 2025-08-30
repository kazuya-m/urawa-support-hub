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

## 📊 Testing Layers

### UseCase Layer Testing

- **Target**: Application business logic
- **Mock**: Infrastructure layer (Services, Repositories)
- **Focus**: Workflow orchestration, error handling

```typescript
const mockService = stub(useCase['infrastructureService'], 'method');
```

### Controller Layer Testing

- **Target**: HTTP request/response handling
- **Mock**: Application layer (UseCases)
- **Focus**: Input validation, response formatting

```typescript
const mockUseCase = stub(controller['useCase'], 'execute');
```

### Service Layer Testing

- **Target**: External system integration
- **Mock**: Repositories, external APIs
- **Focus**: Data transformation, API calls

```typescript
const mockRepository = stub(service['repository'], 'save');
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
