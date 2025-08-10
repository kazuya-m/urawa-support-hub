# NotificationType 改善提案

## 現状の問題

### 1. 型定義の重複

```typescript
// 現在：3箇所で重複定義
// Ticket.ts
type NotificationType = 'day_before' | 'hour_before' | 'minutes_before';

// NotificationHistory.ts
export type NotificationType = 'day_before' | 'hour_before' | 'minutes_before';

// Database.ts
notification_type: 'day_before' | 'hour_before' | 'minutes_before';
```

### 2. 設定値の分散

```typescript
// 現在：各メソッドに時刻がハードコード
private shouldSendDayBeforeNotification(currentTime: Date): boolean {
  const dayBefore = new Date(this.props.saleStartDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(20, 0, 0, 0);  // ← ハードコード
  // ...
  return timeDiff <= 5 * 60 * 1000; // ← ハードコード
}
```

### 3. 拡張時の影響範囲

新しいタイプ追加時に8箇所の修正が必要

## 改善提案

### 1. 一元管理ファイルの作成

```typescript
// src/domain/entities/NotificationTypes.ts
export const NOTIFICATION_TYPES = {
  DAY_BEFORE: 'day_before',
  HOUR_BEFORE: 'hour_before',
  MINUTES_BEFORE: 'minutes_before',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

export const NOTIFICATION_CONFIG = {
  [NOTIFICATION_TYPES.DAY_BEFORE]: {
    displayName: '販売開始前日',
    getScheduledTime: (saleStartDate: Date): Date => {
      const dayBefore = new Date(saleStartDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(20, 0, 0, 0);
      return dayBefore;
    },
    toleranceMs: 5 * 60 * 1000,
  },
  // 他のタイプも同様に設定...
} as const;
```

### 2. エンティティの改良

```typescript
// 改良版：設定駆動
shouldSendNotification(type: NotificationType, currentTime: Date = new Date()): boolean {
  const config = NOTIFICATION_CONFIG[type];
  if (!config) return false;
  
  const scheduledTime = config.getScheduledTime(this.props.saleStartDate);
  const timeDiff = Math.abs(currentTime.getTime() - scheduledTime.getTime());
  return timeDiff <= config.toleranceMs;
}

// 改良版：統一された表示名取得
getNotificationTypeDisplayName(type: NotificationType): string {
  return getNotificationTypeDisplayName(type);
}
```

### 3. DB型の改良

```typescript
// 改良版：型定義を参照
import { NotificationType } from './NotificationTypes.ts';

export interface NotificationRow {
  id: string;
  ticket_id: string;
  notification_type: NotificationType; // ← 一元管理された型を使用
  // ...
}
```

## メリット

### 1. 保守性向上

- **単一責任**: 通知タイプの定義が一箇所に集約
- **DRY原則**: 重複コードの排除
- **型安全性**: TypeScript の型チェックで不整合を防止

### 2. 拡張性向上

```typescript
// 新しいタイプ追加時：1箇所だけ修正
export const NOTIFICATION_TYPES = {
  DAY_BEFORE: 'day_before',
  HOUR_BEFORE: 'hour_before',
  MINUTES_BEFORE: 'minutes_before',
  WEEK_BEFORE: 'week_before', // ← 追加
  THIRTY_MINUTES_BEFORE: '30_minutes_before', // ← 追加
} as const;

// 設定も追加
export const NOTIFICATION_CONFIG = {
  // 既存設定...
  [NOTIFICATION_TYPES.WEEK_BEFORE]: {
    displayName: '販売開始1週間前',
    getScheduledTime: (saleStartDate: Date): Date => {
      return new Date(saleStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    },
    toleranceMs: 60 * 60 * 1000, // 1時間の幅
  },
};
```

### 3. テスタビリティ向上

```typescript
// 設定値のテストが容易
Deno.test('NOTIFICATION_CONFIG - day_before設定', () => {
  const saleStart = new Date('2025-03-15T10:00:00+09:00');
  const config = NOTIFICATION_CONFIG[NOTIFICATION_TYPES.DAY_BEFORE];
  const scheduled = config.getScheduledTime(saleStart);

  assertEquals(scheduled.getDate(), 14); // 前日
  assertEquals(scheduled.getHours(), 20); // 20時
});
```

## 移行戦略

### Phase 1: 基盤作成（破壊的変更なし）

1. `NotificationTypes.ts` 作成
2. 既存コードは維持

### Phase 2: 段階的移行

1. `Ticket.ts` の `shouldSendNotification` を改良版に置換
2. `NotificationHistory.ts` の表示名取得を改良版に置換
3. テスト更新

### Phase 3: 最終整理

1. 重複する型定義を削除
2. 不要になったprivateメソッドを削除

## 結論

現在の実装は基本的な要件は満たしているが、以下の改善により**企業レベルの保守性・拡張性**を実現できる：

1. **一元管理**: 通知タイプの定義・設定を1ファイルに集約
2. **設定駆動**: ハードコードを排除し、設定により動作を制御
3. **型安全性**: TypeScriptの型システムを最大活用

**推奨**: Phase
1から開始し、段階的に改良版へ移行することで、リスクを最小限に抑えながら設計品質を向上させる。
