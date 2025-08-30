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

## Testing Strategy with Clean Architecture

### 🎯 Test Isolation Principles

#### 1. Unit Test Isolation

```typescript
import { assertSpyCalls, stub } from 'testing/mock.ts';

// ✅ Module Mock Strategy - 既存クラス設計維持
Deno.test('Controller test', async () => {
  const useCase = new TicketCollectionUseCase();
  const executeMock = stub(useCase, 'execute', () => Promise.resolve());
  const controller = new TicketCollectionController(useCase);

  await controller.handleRequest(mockRequest);

  assertSpyCalls(executeMock, 1);
});

// ✅ 複雑なMockデータが必要な場合はクラス維持
export class MockJLeagueTicketScraper {
  constructor(mockData: ScrapedTicketData[] = [], shouldThrow = false) {
    // テストデータとエラーシミュレーション
  }
}
```

#### 2. Test Permissions (Minimum Privilege)

```bash
# ✅ Unit tests - minimum permissions
deno test --allow-env --allow-net=127.0.0.1

# ❌ Avoid broad permissions
deno test --allow-all  # 禁止
deno test --allow-sys  # 可能な限り回避
```

#### 3. Mock Interface Compliance

```typescript
import { spy } from 'testing/mock';

// UseCase interface for testing
interface ITicketCollectionUseCase {
  execute(): Promise<void>;
}

### Test File Organization
```

src/adapters/controllers/ ├── TicketCollectionController.ts └── **tests**/ └──
TicketCollectionController.test.ts # Module Mock使用

src/application/usecases/\
├── TicketCollectionUseCase.ts └── **tests**/ ├── TicketCollectionUseCase.test.ts └──
MockTicketCollectionService.ts

````
### 🎯 Module Mock Testing Strategy\n\n```typescript\nimport { stub, assertSpyCalls, assertSpyCallArgs } from 'testing/mock.ts';\n\n// ✅ Repository Unit Test - Module Mock戦略（環境変数・DB接続不要）\nDeno.test('TicketRepository save test', async () => {\n  const repo = new TicketRepositoryImpl();\n  const saveMock = stub(repo, 'save', () => Promise.resolve());\n  \n  await repo.save(testTicket);\n  \n  assertSpyCalls(saveMock, 1);\n  assertSpyCallArgs(saveMock, 0, [testTicket]);\n});\n\n// ✅ UseCase Unit Test - Repository methodをmock\nDeno.test('TicketCollectionUseCase test', async () => {\n  const useCase = new TicketCollectionUseCase();\n  const executeMock = stub(useCase, 'execute', () => Promise.resolve());\n  \n  await useCase.execute();\n  \n  assertSpyCalls(executeMock, 1);\n});\n```\n\n## 🚨 Common Violations and Solutions

### Problem: Layer Skipping

```typescript
// ❌ Problem: Controller calls Service directly
class Controller {
  constructor() {
    this.service = new SomeService(); // Skip UseCase layer
  }
}

// ✅ Solution: Follow layer hierarchy
class Controller {
  constructor(private useCase: IUseCase) {} // Proper layer dependency
}
````

### Problem: Circular Dependencies

```typescript
// ❌ Problem: Circular import
// ServiceA imports ServiceB
// ServiceB imports ServiceA

// ✅ Solution: Extract shared interface
interface ISharedService {
  commonMethod(): void;
}
```

### Problem: Test Dependencies

```typescript
// ❌ Problem: Test imports Infrastructure
import { TicketCollectionService } from '../../infrastructure/...'; // Playwright初期化

// ✅ Solution: Use module mock strategy
const useCase = new TicketCollectionUseCase();
const executeMock = stub(useCase, 'execute', () => Promise.resolve());
```

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
