# テストガイドライン

## 概要

このドキュメントは、urawa-support-hubプロジェクト向けの包括的なテスト戦略とパターンを提供します。特に**小規模プロジェクト**における**直接import戦略**とClean
Architectureの原則に特化しています。

## 🎯 テスト哲学

### 小規模プロジェクト戦略

- **直接メソッドモック化**: `instance['dependency']`パターンで正確なテスト分離
- **最小限のインフラ**: 複雑な依存性注入フレームワークを避ける
- **実用的パターン**: 保守しやすく信頼性の高いテストパターンに重点

### テスト分離原則

- **ネットワーク分離**: すべての単体テストは実際のネットワーク呼び出しを避ける
- **データベース分離**: モックSupabaseクライアントを使用し、実際のデータベースに接続しない
- **リソース管理**: すべてのモックがテスト後に適切に復元されることを保証

## 📁 テストファイル構成

### ディレクトリ構造

```
src/application/usecases/
├── NotificationUseCase.ts
└── __tests__/
    └── NotificationUseCase.test.ts
```

### 命名規則

- **テストファイル**: `{対象ファイル名}.test.ts`
- **配置場所**: 対象ファイルと同レベルの`__tests__/`ディレクトリ
- **テスト説明**: 明確で動作に焦点を当てた説明を使用

## 🧪 基本テストパターン

### 1. 直接メソッドモック化パターン

**✅ 小規模プロジェクト推奨アプローチ**

```typescript
import { assertEquals } from 'std/assert/mod.ts';
import { returnsNext, stub } from 'std/testing/mock.ts';
import { NotificationUseCase } from '@/application/usecases/NotificationUseCase.ts';
import { NOTIFICATION_TYPES } from '@/domain/entities/NotificationTypes.ts';

// テスト環境設定（Supabaseクライアント初期化に必須）
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('NotificationUseCase should call NotificationService.processScheduledNotification', async () => {
  const useCase = new NotificationUseCase();

  // 戻り値を制御した直接メソッドモック化
  const mockMethod = stub(
    useCase['notificationService'], // 内部依存関係にアクセス
    'processScheduledNotification', // 対象メソッド
    returnsNext([Promise.resolve()]), // 制御された応答
  );

  try {
    const input = {
      ticketId: 'test-ticket-123',
      notificationType: NOTIFICATION_TYPES.DAY_BEFORE,
    };

    await useCase.execute(input);

    // モックが正しく呼ばれたことを検証
    assertEquals(mockMethod.calls.length, 1);
    assertEquals(mockMethod.calls[0].args[0], input);
  } finally {
    mockMethod.restore(); // 重要: モックを必ず復元
  }
});
```

### 2. エラーハンドリングテスト

```typescript
Deno.test('NotificationUseCase should handle service errors properly', async () => {
  const useCase = new NotificationUseCase();
  const testError = new Error('Service operation failed');

  // エラーを投げるモック
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

    // エラーハンドリングの検証
    assertEquals(caughtError?.message.includes('Service operation failed'), true);
    assertEquals(mockMethod.calls.length, 1);
  } finally {
    mockMethod.restore();
  }
});
```

### 3. 複数モック管理

```typescript
Deno.test('NotificationUseCase should log execution time', async () => {
  const useCase = new NotificationUseCase();

  // 包括的テストのための複数モック
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

    // サービス呼び出しとロギングの両方を検証
    assertEquals(mockMethod.calls.length, 1);
    assertEquals(consoleLogStub.calls.length, 1);
    assertEquals(consoleLogStub.calls[0].args[0], 'Scheduled notification completed successfully:');
  } finally {
    // すべてのモックを逆順で復元
    consoleLogStub.restore();
    mockMethod.restore();
  }
});
```

## 🛡️ 環境設定

### 必要な環境変数

すべての単体テストは初期化エラーを防ぐため、最小限のSupabase設定が必要です：

```typescript
// すべてのテストファイルの先頭で必要
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
```

### テスト権限

**✅ 最小限必要権限**:

```bash
deno test --allow-env --allow-net=127.0.0.1
```

**❌ 過度な権限を避ける**:

```bash
deno test --allow-all  # 権限が広すぎる
deno test --allow-net   # 外部ネットワークアクセスを許可
```

## 🔄 モッククリーンアップ戦略

### 1. try-finallyパターン（現在のベストプラクティス）

```typescript
Deno.test('example test', async () => {
  const mockMethod = stub(obj, 'method', returnsNext([result]));

  try {
    // テスト実行
    await someOperation();
    // アサーション
    assertEquals(mockMethod.calls.length, 1);
  } finally {
    mockMethod.restore(); // 常に実行される
  }
});
```

### 2. 将来: usingキーワード（利用可能になった時）

```typescript
// 🔮 Deno STDがSymbol.disposeに対応した時の将来実装
Deno.test('future disposable test', async () => {
  // 自動リソース管理（まだサポートされていない）
  using mockMethod = stub(obj, 'method', returnsNext([result]));

  await someOperation();
  assertEquals(mockMethod.calls.length, 1);
  // mockMethodはスコープ終了時に自動復元される
});
```

## 📊 レイヤー別テスト

### UseCaseレイヤーテスト

- **対象**: アプリケーションビジネスロジック
- **モック**: インフラストラクチャレイヤー（Services、Repositories）
- **焦点**: ワークフロー調整、エラーハンドリング

```typescript
const mockService = stub(useCase['infrastructureService'], 'method');
```

### Controllerレイヤーテスト

- **対象**: HTTPリクエスト/レスポンス処理
- **モック**: アプリケーションレイヤー（UseCases）
- **焦点**: 入力検証、レスポンス整形

```typescript
const mockUseCase = stub(controller['useCase'], 'execute');
```

### Serviceレイヤーテスト

- **対象**: 外部システム統合
- **モック**: Repositories、外部API
- **焦点**: データ変換、API呼び出し

```typescript
const mockRepository = stub(service['repository'], 'save');
```

## ⚠️ よくある落とし穴と解決策

### 問題: 単体テストでの実際のネットワーク呼び出し

**❌ 問題**:

```typescript
// テストが実際のSupabase呼び出しを行う
Deno.test('bad test', async () => {
  const useCase = new NotificationUseCase();
  await useCase.execute(input); // 実際のサービス呼び出し！
});
```

**✅ 解決策**:

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

### 問題: モック復元忘れ

**❌ 問題**:

```typescript
Deno.test('bad test', async () => {
  const mock = stub(obj, 'method');
  // restore()なし - 他のテストに影響！
});
```

**✅ 解決策**:

```typescript
Deno.test('good test', async () => {
  const mock = stub(obj, 'method');
  try {
    // テスト実行
  } finally {
    mock.restore(); // 必ず復元
  }
});
```

### 問題: 環境変数依存

**❌ 問題**:

```typescript
// 環境設定なしでSupabase初期化エラー
Deno.test('failing test', async () => {
  const useCase = new NotificationUseCase(); // エラー: SUPABASE_URL不足
});
```

**✅ 解決策**:

```typescript
// まずテスト環境を設定
Deno.env.set('SUPABASE_URL', 'http://test.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key');

Deno.test('working test', async () => {
  const useCase = new NotificationUseCase(); // 初期化成功
});
```

## 🚀 ベストプラクティス要約

### すべきこと ✅

- 確実なモッククリーンアップに`try-finally`を使用
- 最小限のテスト環境変数を設定
- 適切なアーキテクチャレイヤーでモック化
- 説明的なテスト名と明確なアサーションを使用
- 成功とエラーの両方のシナリオをテスト
- 最小権限でテストを実行

### してはいけないこと ❌

- 単体テストで実際のネットワークやデータベース呼び出しを行う
- テスト後のモック復元を忘れる
- 過度なテスト権限（`--allow-all`）を使用
- 単体テストに統合の関心事を混在させる
- 過度に複雑なモック設定を作成

## 🔗 参考資料

- [Clean Architectureガイド](./clean-architecture-guide.md) - アーキテクチャ原則とレイヤー責任
- [システムアーキテクチャ](./system-architecture.md) - 全体的なシステム設計パターン
- [Denoテストドキュメント](https://docs.deno.com/runtime/manual/basics/testing/) -
  公式Denoテストガイド

## 📝 変更履歴

- **2025-01-30**: 直接メソッドモック化パターンによる初期版
- **2025-01-30**: 包括的なエラーハンドリングとクリーンアップ戦略を追加
