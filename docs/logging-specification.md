# Logging Specification

## Overview

本番環境での運用監視を目的とした構造化ログ仕様。GCP Cloud
Loggingと統合し、必要最小限の情報のみを記録。

## Error Handling

### errorUtils API

- `getErrorMessage(error: unknown): string` - 安全なエラーメッセージ抽出
- `getErrorStack(error: unknown): string | undefined` -
  環境依存スタックトレース（本番では`undefined`）
- `getErrorDetails(error: unknown): Record<string, unknown> | undefined` - 追加情報抽出
- `toErrorInfo(error: unknown, code?: string, recoverable = true): ErrorInfo` -
  CloudLogger用構造化エラー

### Usage

```typescript
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

try {
  // 処理
} catch (error) {
  CloudLogger.error('処理失敗', {
    category: LogCategory.SYSTEM,
    context: { ticketId: 'ticket-123' },
    error: toErrorInfo(error, 'PROCESSING_ERROR', false),
  });
}
```

## Log Structure

### Field Separation

- **context** - 処理コンテキスト（ticketId, stage, sessionId）
- **metadata** - メタデータ（queueName, endpoint, retryCount）
- **data** - 処理データ・結果
- **metrics** - パフォーマンス指標（duration, count）

### Categories

```typescript
enum LogCategory {
  TICKET_COLLECTION = 'TICKET_COLLECTION',
  PARSING = 'PARSING',
  VALIDATION = 'VALIDATION',
  NOTIFICATION = 'NOTIFICATION',
  DATABASE = 'DATABASE',
  SYSTEM = 'SYSTEM',
  CLOUD_TASKS = 'CLOUD_TASKS',
}
```

### Severity Levels

- **DEBUG**: 開発時デバッグ情報
- **INFO**: 正常処理の記録
- **WARNING**: 注意が必要な状況
- **ERROR**: エラー発生
- **CRITICAL**: システム障害レベル

## Basic Usage

```typescript
// 成功ログ
CloudLogger.info('チケット収集完了', {
  category: LogCategory.TICKET_COLLECTION,
  context: { ticketId: 'ticket-123' },
  metrics: { duration: 1500, ticketCount: 5 },
});

// エラーログ
CloudLogger.error('データベース保存失敗', {
  category: LogCategory.DATABASE,
  context: { ticketId: 'ticket-123', stage: 'save' },
  error: toErrorInfo(error, 'DB_SAVE_FAILED', false),
});
```

## Best Practices

### ✅ DO

- 全エラー処理で`errorUtils`を使用
- 適切なログレベルを選択
- コンテキスト情報を含める
- フィールド分離戦略に従う

### ❌ DON'T

- 生のエラーオブジェクトを直接使用
- 過剰なデバッグログ
- 本番環境でのスタックトレース露出
- フィールドの混在

## Error Codes

主要なエラーコード：

- `COLLECTION_FAILED` - チケット収集失敗
- `PARSING_ERROR` - データ解析エラー
- `DB_SAVE_FAILED` - データベース保存失敗
- `NOTIFICATION_ERROR` - 通知送信エラー
- `CLOUD_TASKS_ERROR` - Cloud Tasks操作エラー

## Production Considerations

- 本番環境では`DEBUG`ログは出力されない
- スタックトレースは開発環境のみ
- 適切なログ量でコスト最適化
- Cloud Loggingでの構造化検索・アラート活用
