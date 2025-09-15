# Issue: データ品質レベルに応じた通知内容の実装

## 背景

データ品質レベル（DataQuality）の実装が完了し、不完全なデータでも通知を送れるようになりました。
次のステップとして、データ品質に応じて適切な通知内容を生成する機能が必要です。

## 実装内容

### 1. NotificationServiceの拡張

```typescript
// NotificationService.ts
buildNotificationMessage(ticket: Ticket): string {
  const quality = ticket.getDataQuality();
  
  switch(quality) {
    case DataQuality.COMPLETE:
      // 完全なデータ: 全情報を含む通知
      return this.buildCompleteMessage(ticket);
    
    case DataQuality.PARTIAL:
      // 部分的データ: 利用可能な情報のみ含む通知
      return this.buildPartialMessage(ticket);
    
    case DataQuality.MINIMAL:
      // 最小限データ: 基本情報と補足説明を含む通知
      return this.buildMinimalMessage(ticket);
  }
}
```

### 2. メッセージテンプレート例

#### COMPLETE（完全データ）

```
🎫 チケット販売開始のお知らせ

【試合】FC東京 vs 浦和レッズ
【会場】味の素スタジアム
【販売開始】3月1日 10:00
【席種】ビジター席

▼ 購入はこちら
https://example.com/tickets
```

#### PARTIAL（部分的データ）

```
🎫 チケット販売開始のお知らせ

【試合】FC東京 vs 浦和レッズ
【会場】味の素スタジアム
【販売開始】3月1日 10:00

※ 詳細はJ-LEAGUEチケットサイトでご確認ください
```

#### MINIMAL（最小限データ）

```
⚠️ チケット販売情報

FC東京 vs 浦和レッズのチケット販売が
3月1日 10:00から開始されます。

詳細情報が不足しているため、
J-LEAGUEチケットサイトで直接ご確認ください。

https://www.jleague-ticket.jp/
```

### 3. LINEメッセージの調整

```typescript
// LINE Flex Messageでの実装
buildLineFlexMessage(ticket: Ticket): FlexMessage {
  const quality = ticket.getDataQuality();
  
  // データ品質に応じてボタンの表示を変更
  const actions = quality === DataQuality.COMPLETE
    ? [{ type: 'uri', label: '購入する', uri: ticket.ticketUrl }]
    : [{ type: 'uri', label: 'サイトで確認', uri: 'https://www.jleague-ticket.jp/' }];
    
  // ... Flex Message構築
}
```

## 期待される効果

1. **ユーザー体験の向上**
   - データが不完全でも通知を受け取れる
   - 情報レベルが明確に伝わる

2. **運用改善**
   - スクレイピングの部分的失敗に対する耐性
   - データ品質の可視化

## 実装優先度

中〜高（通知の送信自体は可能だが、ユーザー体験に直結するため）

## 関連ファイル

- `src/infrastructure/services/notification/NotificationService.ts`
- `src/domain/entities/DataQuality.ts`
- `src/domain/entities/Ticket.ts`

## テスト項目

- [ ] 各DataQualityレベルでの通知メッセージ生成
- [ ] LINE Flex Messageの適切な構築
- [ ] 欠損データのハンドリング
