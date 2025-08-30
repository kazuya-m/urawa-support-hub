# Clean Architecture Implementation Guide

## Layer Dependencies and Responsibilities

### 🎯 Fundamental Dependency Rule

**Dependencies point inward**: Outer layers depend on inner layers, never the reverse.

```
┌─────────────────────────────────────────────────────────┐
│                    Adapters (Web)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Application (UseCases)             │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │           Domain (Entities)            │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │           Infrastructure                       │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. Domain Layer (Inner)

- **Entities**: `src/domain/entities/`
- **Responsibilities**: Business rules, core logic
- **Dependencies**: None (pure business logic)

#### 2. Application Layer

- **UseCases**: `src/application/usecases/`
- **Responsibilities**: Application workflows, business process orchestration
- **Dependencies**: Domain entities only

#### 3. Infrastructure Layer

- **Services**: `src/infrastructure/services/`
- **Repositories**: `src/infrastructure/repositories/`
- **Responsibilities**: External system integration, data persistence
- **Dependencies**: Domain and Application layers

#### 4. Adapters Layer (Outer)

- **Controllers**: `src/adapters/controllers/`
- **Responsibilities**: HTTP handling, request/response transformation
- **Dependencies**: Application layer (UseCases) only

## 🚨 Critical Dependency Rules

### ✅ Correct Dependencies

```typescript
// ✅ main.ts: Clean separation
const controller = new TicketCollectionController();

// ✅ Controller → UseCase only
export class TicketCollectionController {
  constructor(private ticketCollectionUseCase: ITicketCollectionUseCase) {}
}

// ✅ UseCase → Internal dependency resolution
export class TicketCollectionUseCase {
  private ticketCollectionService: TicketCollectionService;
  private healthRepository: HealthRepositoryImpl;

  constructor() {
    const supabaseClient = createSupabaseAdminClient();
    this.ticketCollectionService = new TicketCollectionService();
    this.healthRepository = new HealthRepositoryImpl(supabaseClient);
  }
}
```

### ❌ Dependency Violations

```typescript
// ❌ Controller → Service (skips UseCase layer)
export class TicketCollectionController {
  constructor() {
    this.service = new TicketCollectionService(); // 違反
  }
}

// ❌ Domain → Infrastructure
export class Ticket {
  save() {
    const repo = new TicketRepositoryImpl(); // 違反
  }
}
```

## Dependency Injection Patterns

### 1. Constructor Injection (Primary)

```typescript
// Adapter layer
export class TicketCollectionController {
  constructor(
    private ticketCollectionUseCase: ITicketCollectionUseCase, // Interface依存
  ) {}
}

// Application layer
export class TicketCollectionUseCase {
  constructor(
    private ticketCollectionService: TicketCollectionService,
    private healthRepository: HealthRepository,
  ) {}
}
```

### 2. Dependency Assembly (main.ts)

```typescript
// main.ts - Composition Root
async function handleRequest(req: Request): Promise<Response> {
  // Infrastructure layer instantiation
  const supabaseClient = createSupabaseAdminClient();
  const ticketCollectionService = new TicketCollectionService();
  const healthRepository = new HealthRepositoryImpl(supabaseClient);

  // Application layer instantiation (handles dependencies internally)
  const ticketCollectionUseCase = new TicketCollectionUseCase();

  // Adapter layer instantiation
  const ticketController = new TicketCollectionController(ticketCollectionUseCase);

  return await ticketController.handleCollectTickets(req);
}
```

## Testing Integration

For comprehensive testing strategies and patterns specific to this project, refer to:

**📋 [Testing Guidelines](./testing-guidelines.md)**

The Testing Guidelines document covers:

- Small-scale project testing strategies
- Direct method mocking patterns
- Mock cleanup and resource management
- Environment setup and test permissions
- Layer-specific testing approaches
- Common testing pitfalls and solutions

This separation allows the Clean Architecture Guide to focus purely on architectural principles
while maintaining detailed testing guidance in a dedicated document.

## Enforcement Guidelines

### 1. Pre-commit Verification

- [ ] No layer skipping (Controller → UseCase → Service)
- [ ] Interface compliance in constructors
- [ ] Mock dependencies in tests
- [ ] Minimum test permissions confirmed

### 2. Code Review Checklist

- [ ] Dependencies point inward only
- [ ] No Infrastructure imports in Adapter tests
- [ ] Proper DI pattern implementation
- [ ] Interface-based mock testing

### 3. Architecture Violations (Auto-reject)

- Controller directly calling Service/Repository
- Domain entities importing Infrastructure
- Circular dependencies between services
- Test files importing Playwright-dependent modules

## Next Steps Integration

This guide should be referenced when:

- **新機能実装前**: Layer responsibility確認
- **テスト作成時**: Mock戦略とPermission設定
- **依存関係設計時**: DI pattern適用
- **コードレビュー時**: Architecture violation確認
