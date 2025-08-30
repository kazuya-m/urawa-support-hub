# urawa-support-hub Claude Code 開発ガイド

**🌐 言語バージョン**:

- **English**: CLAUDE.md
- **日本語**: このドキュメント (CLAUDE_ja.md)

## Role (Claude の役割)

- ソフトウェアエンジニアリングの専門家として行動する
- 肯定を求めるのではなく、批判的で建設的な視点で分析する
- 理解度が100%でない場合は、実装を進める前に理解を深めるための質問をする
- 理解度が100%でない場合は、現在の理解レベルと合わせて実装内容を説明する

## プロジェクト概要

浦和レッズのアウェイマッチチケット販売情報の自動通知システム（サポーター向け）

**🗺️ 重要**: 課題の優先順位と実装ロードマップについては、常に以下を参照してください：

- **docs/issue-priority-roadmap.md** - 期限付きの完全なフェーズベース開発計画
- フェーズ: Foundation → Core → Notification → Integration → Post-Launch Improvements
- MVP リリース目標: 2025-09-30

## 開発ワークフロー

### ブランチ戦略

- `main`: 本番環境用安定ブランチ
- `feature/*`: 機能開発ブランチ（例：`feature/implement-ticket-repository`）
- `fix/*`: バグ修正ブランチ

### コミット粒度とブランチ管理

**🚨 重要**: 実装開始前に必ず新しいブランチを作成

**ブランチ作成要件**:

- **必須**: issue番号付きブランチ作成: `feature/#<issue-number>_<description>`
- **例**: `feature/#6_add-pre-commit-hooks`
- **`main`ブランチでの直接実装は禁止**

**重要**: 機能ごとに適切にブランチを作成し、小さな単位でコミット

#### 推奨パターン:

1. **機能実装**: 機能ごとに新しいブランチを作成
   ```bash
   git checkout -b feature/implement-basic-types
   # 型定義を実装
   git add . && git commit -m "add basic types for Ticket and NotificationHistory"

   git checkout -b feature/implement-ticket-repository
   # リポジトリを実装
   git add . && git commit -m "implement TicketRepository interface and Supabase implementation"
   ```

2. **コミット単位**: 論理的変更につき1コミット
   - ✅ 良い例: "Ticket型定義を追加"
   - ✅ 良い例: "SupabaseTicketRepository saveメソッドを実装"
   - ❌ 悪い例: "チケット管理に関するすべてを実装"

3. **プルリクエスト**: 機能完成後にmainまたはdevelopにマージ

### 現在の実装フェーズ

フェーズ1: 基盤構築とコア機能実装

### 実装フェーズ

1. **Google Cloudセットアップ**: Cloud Run、Scheduler、Tasksの設定
2. **Supabase統合**: データベーススキーマとEdge Functions設定
3. **スクレイピングサービス**: Cloud Run内でPlaywrightベースのチケット抽出
4. **通知システム**: Cloud Tasks経由のイベント駆動通知
5. **リポジトリレイヤー**: Supabase PostgreSQLでのデータ永続化
6. **エラーハンドリング**: Discord アラート付き包括的監視
7. **テスト戦略**: 適切な権限でのユニット・統合テスト
8. **本番デプロイ**: 監視付きマルチステージデプロイ

### コアアーキテクチャ

**🏗️ ハイブリッド Google Cloud + Supabase アーキテクチャ**

- **スクレイピング実行**: Google Cloud Run（Playwright、2GBメモリ、300秒タイムアウト）
- **日次トリガー**: Google Cloud Scheduler（12:00 JST）
- **通知スケジューリング**: Google Cloud Tasks（イベント駆動、指数バックオフ）
- **データベース**: Supabase PostgreSQL（プライマリデータストレージ）
- **通知配信**: Supabase Edge Functions（512MBメモリ、60秒タイムアウト）
- **外部サービス**: LINE Messaging API + Discord Webhook

### 重要な制約

- **Cloud Run**: 2GBメモリ、300秒タイムアウト（スクレイピング用）
- **Edge Functions**: 512MBメモリ、60秒タイムアウト（通知用）
- **コスト**: 無料枠制限内での運用必須
- **信頼性**: 内蔵リトライメカニズム付きイベント駆動アーキテクチャ

### 最新設計ドキュメント

**⚠️ 重要**: 実装前に必ず最新ドキュメントを参照:

- **docs/ja/system-architecture.md** - システムアーキテクチャと設計パターン
- **docs/ja/implementation-guide.md** - コード例付き詳細技術実装
- **docs/ja/tech-selection.md** - 技術選定根拠と代替案
- **docs/ja/requirements.md** - 機能・非機能要件
- **docs/ja/setup-guide.md** - 環境セットアップとデプロイガイド

### ドキュメント作成原則

**📚 重要: マスターソースとしてのドキュメント**

ドキュメントは実装履歴や移行ガイドではなく、実装と運用の唯一の情報源として機能します。

**🎯 ドキュメントの目的**:

- **マスター参照資料**: 現在の状態に対する決定的な実装ガイド
- **運用知識**: システムの動作方法と使用方法
- **技術仕様**: API、設定、パターン

**❌ 含めてはいけない内容**:

- 実装過程の説明（「フェーズ1: 最初に...」「移行手順」）
- 歴史的経緯や「どうやってここに至ったか」の説明
- 一時的な回避策や移行専用の内容
- 開発タイムラインやプロジェクト管理情報

**✅ 含めるべき内容**:

- 現在の実装パターンと例
- 設定要件とフォーマット
- API仕様と使用例
- トラブルシューティングと運用手順
- セキュリティ要件とベストプラクティス

**構造例**:

```markdown
# サービス名

## 設定

[現在の設定フォーマット]

## 使用方法

[サービスの使用方法]

## API リファレンス

[現在のAPIパターン]

## セキュリティ

[現在のセキュリティ要件]
```

**🚨 重要ルール**:
ドキュメントは、読者が開発履歴ではなく現在のシステムを理解し使用する必要があるかのように書くこと。

## 開発ノート

- 実装前にJリーグチケットサイト構造を必ず調査
- 各機能にエラーハンドリングを実装
- ログ出力に適切なデバッグ情報を記録
- テスト駆動開発を実践
- **コードフォーマット**:
  全TypeScriptとMarkdownファイルで一貫したコードフォーマットのため必ず`deno fmt`を使用

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
- **例**: `src/features/repositories/TicketRepository.ts` →
  `src/features/repositories/__tests__/TicketRepository.test.ts`

##### テスト実装要件

- **ユニットテスト作成**: 各関数・メソッドの単体動作を確認するテスト
  (対象ファイルと同階層の`__tests__/`ディレクトリ)
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
- [ ] `deno test --allow-env` 全テスト成功確認済み
- [ ] 動作確認テスト実行済み
- [ ] エラーケース・境界値テスト実行済み
- [ ] テストデータのクリーンアップ確認済み

**重要**: 動作確認なしでのコミット・PRは禁止。必ずテストを通してから次の工程に進むこと。

## 設計原則とベストプラクティス

### 🎯 必須遵守事項

#### 0. 小規模プロジェクト設計原則

**🚨 重要: docs/ディレクトリの設計パターンに従う**

- **docs/system-architecture.md** と **docs/implementation-guide.md** の設計決定を参照
- **docs/clean-architecture-guide.md** のテスト戦略とパターンに従う
- ドキュメント化されたパターンと実装の一貫性を維持

#### 1. 命名規則

```typescript
// ✅ Good: 具象クラス直接使用（小規模プロジェクト向け）
export class TicketRepositoryImpl {
  constructor() {
    this.client = createSupabaseAdminClient();
  }
}

// ❌ Bad: interface使用（過度な抽象化）
export interface TicketRepository // interfaceそのものが不要
```

#### 2. エラーハンドリング統一

```typescript
// ✅ 共通ユーティリティを使用
if (error) handleSupabaseError('save ticket', error);

// ❌ 重複コード
if (error) throw new Error(`Failed to save ticket: ${error.message}`);
```

#### 3. テスト設計

- **Module Mock戦略**: `stub(instance, method)` from `testing/mock.ts` 使用
- **環境変数不要**: Unit testは実際のDB接続を回避
- **分割**: 個別テストケース作成（巨大統合テスト禁止）
- **権限**: `--allow-env --allow-net=127.0.0.1` （`--allow-all` 禁止）

```typescript
// ✅ 正しい: Module Mock使用
import { assertSpyCalls, stub } from 'testing/mock.ts';

const repo = new TicketRepositoryImpl();
const saveMock = stub(repo, 'save', () => Promise.resolve());

// ❌ 間違い: 外部client注入
const repo = new TicketRepositoryImpl(mockClient);
```

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

- [ ] `{Entity}RepositoryImpl` 具象クラス直接使用
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
