# urawa-support-hub Claude Code 開発メモ

# Role (Claudeの役割)
- ソフトウェアエンジニアのエキスパートとして振る舞います
- 肯定を目的とせず、批判的かつ建設的な視点で分析します
- 理解度が100%に達していない場合、そのまま実装を進めるのではなく、質問を返して理解を深めること
- 理解度が100%に達していない場合、その時点での理解度を示した上で実装の内容を説明すること

## プロジェクト概要
浦和レッズサポーター向けアウェイ戦チケット販売情報自動通知システム

## 開発ワークフロー

### ブランチ戦略
- `main`: 本番環境用の安定ブランチ
- `feature/*`: 機能開発用ブランチ（例: `feature/implement-ticket-repository`）
- `fix/*`: バグ修正用ブランチ

### コミット粒度とブランチ運用
**重要**: 機能単位で適切にブランチを切り、小さな単位でコミットすること

#### 推奨パターン:
1. **機能実装時**: 各機能ごとに新しいブランチを作成
   ```bash
   git checkout -b feature/implement-basic-types
   # 型定義実装
   git add . && git commit -m "add basic types for Ticket and NotificationHistory"
   
   git checkout -b feature/implement-ticket-repository
   # リポジトリ実装
   git add . && git commit -m "implement TicketRepository interface and Supabase implementation"
   ```

2. **コミット単位**: 1つの論理的変更につき1コミット
   - ✅ Good: "add Ticket type definition"
   - ✅ Good: "implement SupabaseTicketRepository save method"
   - ❌ Bad: "implement everything for ticket management"

3. **プルリクエスト**: 機能完成後にmainまたはdevelopにマージ

### 現在の実装フェーズ
Phase 1: 基盤構築とコア機能実装

### 次のステップ
1. 基盤構築 (プロジェクト構造、Deno設定)
2. Supabase初期化 (DB スキーマ)
3. 型定義作成
4. リポジトリ層実装
5. 通知サービス実装
6. スクレイピング機能実装
7. Edge Functions実装
8. テスト実装

### 技術スタック
- Runtime: Deno + TypeScript
- Database: Supabase PostgreSQL
- Functions: Supabase Edge Functions
- Scraping: Playwright
- Notifications: LINE Messaging API + Discord Webhook
- Scheduler: pg_cron

### 環境設定状況
- LINE Messaging API: ✅ 設定完了
- Discord Webhook: 未設定
- Supabase: 未初期化

### 重要な制約事項
- メモリ制限: 512MB (Edge Functions)
- 実行時間制限: 60秒
- 無料枠内での運用必須

## 開発時の注意点
- 実装前に必ずJリーグチケットサイトの構造を調査
- エラーハンドリングを各機能に必ず実装
- ログ出力でデバッグ情報を適切に記録
- テスト駆動開発を心がける

## 必須開発プロセス
### 🚨 実装後は必ず動作確認とテスト実行を行うこと

#### 1. 動作確認の手順
- **TypeScript型チェック**: `deno check` でコンパイルエラーがないことを確認
- **Lintチェック**: `deno lint` でコード品質を確認
- **ローカル環境での実行テスト**: 実装した機能が期待通り動作することを確認
- **データベース連携確認**: Supabaseとの接続、CRUD操作の動作確認
- **制約・バリデーション確認**: データベース制約、型チェックの動作確認
- **エラーハンドリング確認**: 異常系のケースでエラーが適切に処理されることを確認

#### 2. テスト実装の義務

##### ユニットテストファイル配置ルール
- **配置場所**: 対象ファイルと同階層に`__tests__`ディレクトリを作成し、その中にテストファイルを配置
- **ファイル命名**: `対象ファイル名.test.ts`形式で命名
- **例**: `src/features/repositories/TicketRepository.ts` → `src/features/repositories/__tests__/TicketRepository.test.ts`

##### テスト実装要件
- **ユニットテスト作成**: 各関数・メソッドの単体動作を確認するテスト (対象ファイルと同階層の`__tests__/`ディレクトリ)
- **統合テストスクリプト作成**: 主要機能の動作を確認する実行可能なテスト (`tests/integration/`)
- **実際のデータでのテスト**: ダミーデータではなく実際の制約に合うテストデータ使用
- **境界値テスト**: 正常系・異常系・境界値での動作確認
- **モックテスト**: 外部依存関係をモック化した単体テスト
- **クリーンアップ処理**: テスト後のデータ削除を含む完全なテスト
- **テスト結果の検証**: 全てのテストケースが成功することを確認

#### 3. コミット前チェックリスト
- [ ] `deno check` 型チェック成功確認済み
- [ ] `deno lint` Lintチェック成功確認済み
- [ ] **ユニットテスト作成済み** (対象ファイルと同階層の`__tests__/`ディレクトリ)
- [ ] **統合テスト作成済み** (tests/integration/)
- [ ] `deno test --allow-all` 全テスト成功確認済み
- [ ] 動作確認テスト実行済み
- [ ] エラーケース・境界値テスト実行済み
- [ ] テストデータのクリーンアップ確認済み

**重要**: 動作確認なしでのコミット・PRは禁止。必ずテストを通してから次の工程に進むこと。

## 設計原則とベストプラクティス

### 🎯 必須遵守事項

#### 1. 命名規則
```typescript
// ✅ Good: 技術非依存
export class TicketRepositoryImpl implements TicketRepository

// ❌ Bad: 外部サービス依存
export class SupabaseTicketRepository implements TicketRepository
```

#### 2. エラーハンドリング統一
```typescript
// ✅ 共通ユーティリティを使用
if (error) handleSupabaseError('save ticket', error);

// ❌ 重複コード
if (error) throw new Error(`Failed to save ticket: ${error.message}`);
```

#### 3. テスト設計
- **分割**: 個別テストケース作成（巨大統合テスト禁止）
- **共通化**: `createTestSupabaseClient()`, `cleanupTestData()` 活用
- **権限**: `--allow-env --allow-net=127.0.0.1` （`--allow-all` 禁止）

#### 4. ディレクトリ構造
```
src/features/
├── shared/repositories/  # インターフェース
├── shared/utils/        # 共通処理
└── {feature}/repositories/{Entity}RepositoryImpl.ts
```

### 🚨 禁止事項
- 外部サービス名をクラス名に含める
- エラーハンドリングの重複
- `--allow-all` 権限使用
- 巨大な統合テスト

### 🎯 次回セッション時チェック項目
- [ ] `{Entity}RepositoryImpl` 命名使用
- [ ] 共通エラーハンドラー活用
- [ ] 最小権限設定
- [ ] 既存パターンとの一貫性確認

## 設定駆動設計パターン

### 🎯 NotificationConfig 設定外部化
運用中の値変更に対応するため、通知タイミング設定を完全外部化

```typescript
// ✅ 設定駆動: NotificationConfig.ts
export const NOTIFICATION_TIMING_CONFIG = {
  day_before: {
    displayName: '販売開始前日',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      // 前日20:00設定 (変更時はここだけ修正)
    },
    toleranceMs: 5 * 60 * 1000
  }
}

// ✅ エンティティでは設定を参照
shouldSendNotification(type: NotificationType, currentTime: Date): boolean {
  return shouldSendNotificationAtTime(type, this.saleStartDate, currentTime);
}
```

#### メリット
- **保守性**: 通知タイミング変更時は1箇所だけ修正
- **拡張性**: 新しい通知タイプを簡単追加可能
- **型安全性**: TypeScriptの型チェックで整合性担保

#### 適用済み箇所
- `src/domain/entities/NotificationConfig.ts`: 設定定義
- `src/domain/entities/Ticket.ts`: ハードコード削除、設定利用
- `src/domain/entities/NotificationHistory.ts`: 表示名・バリデーション統一