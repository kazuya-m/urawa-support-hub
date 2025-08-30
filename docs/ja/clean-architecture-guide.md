# Clean Architecture実装ガイド

## レイヤー依存関係と責務

### 🎯 基本依存関係ルール

**依存関係は内側を向く**: 外側のレイヤーは内側のレイヤーに依存し、その逆はありません。

```
┌─────────────────────────────────────────────────────────┐
│                  Adapters (Web)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │            Application (UseCases)               │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │         Domain (Entities)              │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Infrastructure                         │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### レイヤー責務

#### 1. ドメインレイヤー（内側）

- **エンティティ**: `src/domain/entities/`
- **責務**: ビジネスルール、コアロジック
- **依存関係**: なし（純粋なビジネスロジック）

#### 2. アプリケーションレイヤー

- **ユースケース**: `src/application/usecases/`
- **責務**: アプリケーションワークフロー、ビジネスプロセス編成
- **依存関係**: ドメインエンティティのみ

#### 3. インフラストラクチャレイヤー

- **サービス**: `src/infrastructure/services/`
- **リポジトリ**: `src/infrastructure/repositories/`
- **責務**: 外部システム統合、データ永続化
- **依存関係**: ドメインおよびアプリケーションレイヤー

#### 4. アダプターレイヤー（外側）

- **コントローラー**: `src/adapters/controllers/`
- **責務**: HTTP処理、リクエスト/レスポンス変換
- **依存関係**: アプリケーションレイヤー（ユースケース）のみ

## 🚨 重要な依存関係ルール

### ✅ 正しい依存関係

```typescript
// ✅ main.ts: 明確な分離
const controller = new TicketCollectionController();

// ✅ Controller → UseCase のみ
export class TicketCollectionController {
  constructor(private ticketCollectionUseCase: ITicketCollectionUseCase) {}
}

// ✅ UseCase → 内部依存解決
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

### ❌ 依存関係違反

```typescript
// ❌ Controller → Service (UseCaseレイヤーをスキップ)
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

## 依存性注入パターン

### 1. コンストラクタ注入（主要）

```typescript
// Adapterレイヤー
export class TicketCollectionController {
  constructor(
    private ticketCollectionUseCase: ITicketCollectionUseCase, // インターフェース依存
  ) {}
}

// Applicationレイヤー
export class TicketCollectionUseCase {
  constructor(
    private ticketCollectionService: TicketCollectionService,
    private healthRepository: HealthRepository,
  ) {}
}
```

### 2. 依存関係組立（main.ts）

```typescript
// main.ts - Composition Root
async function handleRequest(req: Request): Promise<Response> {
  // Infrastructureレイヤーのインスタンス化
  const supabaseClient = createSupabaseAdminClient();
  const ticketCollectionService = new TicketCollectionService();
  const healthRepository = new HealthRepositoryImpl(supabaseClient);

  // Applicationレイヤーのインスタンス化（依存関係を内部で処理）
  const ticketCollectionUseCase = new TicketCollectionUseCase();

  // Adapterレイヤーのインスタンス化
  const ticketController = new TicketCollectionController(ticketCollectionUseCase);

  return await ticketController.handleCollectTickets(req);
}
```

## Clean Architectureでのテスト戦略

### 🎯 テスト分離原則

#### 1. ユニットテスト分離

```typescript
import { assertSpyCalls, stub } from 'testing/mock.ts';

// ✅ モジュールモック戦略 - 既存クラス設計維持
Deno.test('Controller test', async () => {
  const useCase = new TicketCollectionUseCase();
  const executeMock = stub(useCase, 'execute', () => Promise.resolve());
  const controller = new TicketCollectionController(useCase);

  await controller.handleRequest(mockRequest);

  assertSpyCalls(executeMock, 1);
});

// ✅ 複雑なモックデータが必要な場合はクラス維持
export class MockJLeagueTicketScraper {
  constructor(mockData: ScrapedTicketData[] = [], shouldThrow = false) {
    // テストデータとエラーシミュレーション
  }
}
```

#### 2. テスト権限（最小権限）

```bash
# ✅ ユニットテスト - 最小権限
deno test --allow-env --allow-net=127.0.0.1

# ❌ 広範囲権限は回避
deno test --allow-all  # 禁止
deno test --allow-sys  # 可能な限り回避
```

#### 3. モックインターフェース準拠

```typescript
import { spy } from 'testing/mock';

// テスト用UseCaseインターフェース
interface ITicketCollectionUseCase {
  execute(): Promise<void>;
}
```

### テストファイル構成

```
src/adapters/controllers/
├── TicketCollectionController.ts
└── __tests__/
    └── TicketCollectionController.test.ts  # モジュールモック使用

src/application/usecases/
├── TicketCollectionUseCase.ts
└── __tests__/
    ├── TicketCollectionUseCase.test.ts
    └── MockTicketCollectionService.ts
```

### 🎯 モジュールモックテスト戦略

```typescript
import { assertSpyCallArgs, assertSpyCalls, stub } from 'testing/mock.ts';

// ✅ Repositoryユニットテスト - モジュールモック戦略（環境変数・DB接続不要）
Deno.test('TicketRepository save test', async () => {
  const repo = new TicketRepositoryImpl();
  const saveMock = stub(repo, 'save', () => Promise.resolve());

  await repo.save(testTicket);

  assertSpyCalls(saveMock, 1);
  assertSpyCallArgs(saveMock, 0, [testTicket]);
});

// ✅ UseCaseユニットテスト - Repositoryメソッドをモック
Deno.test('TicketCollectionUseCase test', async () => {
  const useCase = new TicketCollectionUseCase();
  const executeMock = stub(useCase, 'execute', () => Promise.resolve());

  await useCase.execute();

  assertSpyCalls(executeMock, 1);
});
```

## 🚨 よくある違反と解決法

### 問題: レイヤースキップ

```typescript
// ❌ 問題: ControllerがServiceを直接呼び出し
class Controller {
  constructor() {
    this.service = new SomeService(); // UseCaseレイヤーをスキップ
  }
}

// ✅ 解決: レイヤー階層に従う
class Controller {
  constructor(private useCase: IUseCase) {} // 適切なレイヤー依存
}
```

### 問題: 循環依存関係

```typescript
// ❌ 問題: 循環インポート
// ServiceAがServiceBをインポート
// ServiceBがServiceAをインポート

// ✅ 解決: 共有インターフェースを抽出
interface ISharedService {
  commonMethod(): void;
}
```

### 問題: テスト依存関係

```typescript
// ❌ 問題: テストがInfrastructureをインポート
import { TicketCollectionService } from '../../infrastructure/...'; // Playwright初期化

// ✅ 解決: モジュールモック戦略を使用
const useCase = new TicketCollectionUseCase();
const executeMock = stub(useCase, 'execute', () => Promise.resolve());
```

## 適用ガイドライン

### 1. プリコミット検証

- [ ] レイヤースキップなし（Controller → UseCase → Service）
- [ ] コンストラクタでのインターフェース準拠
- [ ] テストでの依存関係モック
- [ ] 最小テスト権限確認

### 2. コードレビューチェックリスト

- [ ] 依存関係が内側のみを向いている
- [ ] AdapterテストでInfrastructureインポートなし
- [ ] 適切なDIパターン実装
- [ ] インターフェースベースモックテスト

### 3. アーキテクチャ違反（自動リジェクト）

- ControllerがService/Repositoryを直接呼び出し
- ドメインエンティティがInfrastructureをインポート
- サービス間の循環依存関係
- テストファイルがPlaywright依存モジュールをインポート

## 次のステップ統合

このガイドは以下の場合に参照すべきです：

- **新機能実装前**: レイヤー責務確認
- **テスト作成時**: モック戦略と権限設定
- **依存関係設計時**: DIパターン適用
- **コードレビュー時**: アーキテクチャ違反確認
