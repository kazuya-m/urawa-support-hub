# urawa-support-hub Claude Code開発ガイド

## 役割（Claudeの役割）

- ソフトウェアエンジニアリングの専門家として行動する
- 承認を求めるのではなく、批判的で建設的な視点で分析する
- 理解が100%でない場合は、実装に進むのではなく、理解を深めるための質問をする
- 理解が100%でない場合は、現在の理解レベルと共に実装内容を説明する

## プロジェクト概要

浦和レッズサポーター向けのアウェイマッチチケット販売情報の自動通知システム

**🗺️ 重要**: issue優先順位と実装ロードマップについては、必ず以下を参照してください：

- **docs/issue-priority-roadmap.md** - 期限付きの完全なフェーズベース開発計画
- フェーズ: 基盤構築 → コア → 通知 → 統合 → ローンチ後改善
- MVPローンチ目標: 2025-09-30

## 開発ワークフロー

### ブランチ戦略

- `main`: 本番環境用安定ブランチ
- `feature/*`: 機能開発ブランチ（例：`feature/implement-ticket-repository`）
- `fix/*`: バグ修正ブランチ

### コミット粒度とブランチ管理

**🚨 重要**: 実装前に必ず新しいブランチを作成する

**ブランチ作成要件**:

- **必須**: issue番号でブランチ作成: `feature/#<issue-number>_<description>`
- **例**: `feature/#6_add-pre-commit-hooks`
- **`main`ブランチで直接実装しない**

**重要**: 機能ごとに適切にブランチを作成し、小さな単位でコミットする

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

2. **コミット単位**: 論理的な変更ごとに1コミット
   - ✅ 良い: "add Ticket type definition"
   - ✅ 良い: "implement SupabaseTicketRepository save method"
   - ❌ 悪い: "implement everything for ticket management"

3. **プルリクエスト**: 機能完了後にmainまたはdevelopにマージ

### 現在の実装フェーズ

フェーズ1: 基盤構築とコア機能実装

### 実装フェーズ

1. **Google Cloud設定**: Cloud Run、Scheduler、Tasksの設定
2. **Supabase統合**: データベーススキーマとEdge Functions設定
3. **スクレイピングサービス**: Cloud RunでのPlaywrightベースチケット抽出
4. **通知システム**: Cloud Tasksによるイベント駆動通知
5. **リポジトリ層**: Supabase PostgreSQLでのデータ永続化
6. **エラーハンドリング**: Discord通知による包括的監視
7. **テスト戦略**: 適切な権限でのユニットテストと統合テスト
8. **本番デプロイ**: 監視付きマルチステージデプロイ

### コアアーキテクチャ

**🏗️ ハイブリッドGoogle Cloud + Supabaseアーキテクチャ**

- **スクレイピング実行**: Google Cloud Run（Playwright、2GBメモリ、300秒タイムアウト）
- **日次トリガー**: Google Cloud Scheduler（12:00 JST）
- **通知スケジューリング**: Google Cloud Tasks（イベント駆動、指数バックオフ）
- **データベース**: Supabase PostgreSQL（プライマリデータストレージ）
- **通知配信**: Supabase Edge Functions（512MBメモリ、60秒タイムアウト）
- **外部サービス**: LINE Messaging API + Discord Webhook

### 重要な制約

- **Cloud Run**: 2GBメモリ、300秒タイムアウト（スクレイピング用）
- **Edge Functions**: 512MBメモリ、60秒タイムアウト（通知用）
- **コスト**: 無料枠内での運用必須
- **信頼性**: 組み込み再試行メカニズムによるイベント駆動アーキテクチャ

### 最新設計ドキュメント

**⚠️ 重要**: 実装前に必ず最新ドキュメントを参照してください：

- **docs/system-architecture.md** - 完全なシステムアーキテクチャと設計パターン
- **docs/implementation-guide.md** - コード例付き詳細技術実装
- **docs/tech-selection.md** - 技術選定根拠と代替案
- **docs/requirements.md** - 機能要件と非機能要件
- **docs/setup-guide.md** - 環境設定とデプロイガイド

### ドキュメント言語管理

**🌐 多言語ドキュメントポリシー**:

- **主言語**: 英語（docs/*.md）
- **副言語**: 日本語（docs/ja/*.md）
- **更新順序**: 常に英語を先に更新し、日本語が追従
- **一貫性ルール**: 日本語版は常に英語版を追跡する
- **参照優先度**: 実装時の正としたドキュメントは英語版を使用

**重要**: ドキュメント作成・更新時:

1. 英語版を最初に作成/更新
2. 即座に対応する日本語版を作成/更新
3. 言語間でコンテンツの一貫性を確保
4. CLAUDE.md指示で英語版ドキュメントを参照

## 開発ノート

- 実装前にJ-Leagueチケットサイト構造を必ず調査
- 各機能でエラーハンドリングを実装
- ログ出力に適切なデバッグ情報を記録
- テスト駆動開発を実践
- **コードフォーマット**:
  全TypeScriptとMarkdownファイルで一貫したコードフォーマット用に`deno fmt`を常に使用

## 必須開発プロセス

### 🚨 実装後に必ず動作確認とテスト実行を行う

#### 1. 動作確認手順

- **TypeScript型チェック**: `deno check`でコンパイルエラーがないことを確認
- **Lintチェック**: `deno lint`でコード品質を確認
- **ローカル環境実行テスト**: 実装した機能が期待通りに動作することを確認
- **データベース統合確認**: Supabase接続とCRUD操作を確認
- **制約/バリデーション確認**: データベース制約と型チェックが適切に動作することを確認
- **エラーハンドリング確認**: 例外的なケースでエラーが適切に処理されることを確認

#### 2. テスト実装要件

##### ユニットテストファイル配置ルール

- **配置**: 対象ファイルと同じレベルに`__tests__`ディレクトリを作成し、内部にテストファイルを配置
- **ファイル名**: `targetFileName.test.ts`形式で命名
- **例**: `src/features/repositories/TicketRepository.ts` →
  `src/features/repositories/__tests__/TicketRepository.test.ts`

##### テスト実装要件

- **ユニットテスト作成**:
  個別関数/メソッドの動作を検証するテスト（対象ファイルと同レベルの`__tests__/`ディレクトリ内）
- **統合テストスクリプト作成**: 主要機能を検証する実行可能テスト（`tests/integration/`）
- **実際のデータでのテスト**: ダミーデータではなく実際の制約に合致するテストデータを使用
- **境界値テスト**: 正常、例外、境界値ケースでの動作を検証
- **モックテスト**: 外部依存関係をモック化したユニットテスト
- **クリーンアップ処理**: テスト後のデータ削除を含めてテストを完了
- **テスト結果確認**: 全テストケースが成功することを確認

#### 3. プリコミットチェックリスト

- [ ] `deno check`型チェック成功確認
- [ ] `deno lint`リントチェック成功確認
- [ ] **ユニットテスト作成**（対象ファイルと同レベルの`__tests__/`ディレクトリ内）
- [ ] **統合テスト作成**（tests/integration/）
- [ ] `deno test --allow-env`全テスト成功確認
- [ ] 動作確認テスト実行
- [ ] エラーケースと境界値テスト実行
- [ ] テストデータクリーンアップ確認

**重要**: 動作確認なしのコミット/PRは禁止。テスト通過後に次のステップに進む。

## 設計原則とベストプラクティス

### 🎯 必須遵守項目

#### 1. 技術選定と一貫性原則

**🎯 プロジェクト技術スタック優先度**:

- **第一考慮**: ハイブリッドGoogle Cloud + Supabaseアーキテクチャに従う
- **Cloud Run**: リソース集約的なPlaywrightスクレイピング操作に使用
- **Edge Functions**: 軽量な通知配信に使用
- **外部依存関係**: 依存関係を最小化し、アーキテクチャ一貫性を優先

**🎯 問題解決アプローチ**:

- **要件ベース**: 「どのツールを使うか」ではなく「何を達成する必要があるか」から開始
- **プロジェクトコンテキスト**: ソリューション提案前にプロジェクト哲学と制約を理解
- **ツール固着回避**: 人気ツールにデフォルトしない；プロジェクト最適ソリューションを見つける

**アーキテクチャ例**:

```typescript
// ✅ 良い: 重い操作用のCloud Run
export class PlaywrightScrapingService {
  // 2GBメモリのCloud Runで実行
}

// ✅ 良い: 軽量タスク用のEdge Functions
export class LineNotificationService {
  // 512MBメモリのEdge Functionsで実行
}

// ❌ 悪い: タスク複雑度に対して間違ったサービス
// Edge FunctionsでPlaywrightを実行（メモリ制限）
```

#### 2. 命名規則

```typescript
// ✅ 良い: 技術独立
export class TicketRepositoryImpl implements TicketRepository

// ❌ 悪い: 外部サービス依存
export class SupabaseTicketRepository implements TicketRepository
```

#### 2. 統一エラーハンドリング

```typescript
// ✅ 共通ユーティリティを使用
if (error) handleSupabaseError('save ticket', error);

// ❌ 重複コード
if (error) throw new Error(`Failed to save ticket: ${error.message}`);
```

#### 3. テスト設計

- **分離**: 個別テストケースを作成（巨大統合テスト禁止）
- **共通ユーティリティ**: `createTestSupabaseClient()`、`cleanupTestData()`を活用
- **権限**: `--allow-env --allow-net=127.0.0.1`（`--allow-all`禁止）
- **Cloud統合**: Cloud RunとEdge Functionsを個別にテスト
- **モックサービス**: ユニットテストで外部Cloudサービスをモック

#### 4. ディレクトリ構造

```
src/features/
├── shared/repositories/  # インターフェース
├── shared/utils/        # 共通処理
└── {feature}/repositories/{Entity}RepositoryImpl.ts
```

### 🚨 禁止項目

- クラス名に外部サービス名を含める
- 重複エラーハンドリング
- `--allow-all`権限の使用
- 巨大統合テスト

### 🎯 次セッションチェック項目

- [ ] `{Entity}RepositoryImpl`命名を使用
- [ ] 共通エラーハンドラーを活用
- [ ] 最小権限を設定
- [ ] 既存パターンとの一貫性を確認

## GitHub IssueとPull Request管理

### 🎯 Pull Request作成要件

**言語要件**:

- **PRタイトル**: 日本語を使用（`pre-commitフック実装（Denoネイティブ）#6`）
- **PR説明**: チーム理解向上のため日本語で記述
- **issue番号含む**: GitHub統合のためタイトルに`#<issue-number>`を追加

**自動クローズ要件**:

- **必ず含める**: PR説明に`Closes #<issue-number>`
- **効果**: PR マージ時にGitHubが関連issueを自動クローズ
- **代替キーワード**: `Fixes #<issue-number>`、`Resolves #<issue-number>`

**PR例形式**:

```markdown
## 概要

- 実装内容の概要

## 実装内容

- 詳細な変更内容

Closes #6
```

## 設定駆動設計パターン

### 🎯 NotificationConfig外部化

運用中の値変更に対応するための通知タイミング設定の完全外部化

```typescript
// ✅ 設定駆動: NotificationConfig.ts
export const NOTIFICATION_TIMING_CONFIG = {
  day_before: {
    displayName: 'Day before sale start',
    calculateScheduledTime: (saleStartDate: Date): Date => {
      // 前日20:00に設定（変更時はここだけ修正）
    },
    toleranceMs: 5 * 60 * 1000
  }
}

// ✅ エンティティは設定を参照
shouldSendNotification(type: NotificationType, currentTime: Date): boolean {
  return shouldSendNotificationAtTime(type, this.saleStartDate, currentTime);
}
```

#### メリット

- **保守性**: 通知タイミング変更時は1箇所のみ修正
- **拡張性**: 新しい通知タイプを簡単に追加
- **型安全性**: TypeScript型チェックで一貫性を保証

#### 適用箇所

- `src/domain/entities/NotificationConfig.ts`: 設定定義
- `src/domain/entities/Ticket.ts`: ハードコーディング削除、設定使用
- `src/domain/entities/NotificationHistory.ts`: 表示名とバリデーション統一

## コマンド実行ガイドライン

### 権限によりコマンドが失敗する場合

システム変更コマンド（`rm`、`mv`、`mkdir`など）が権限制限で失敗する場合:

1. **状況を明確に説明**する
2. **正確なコマンド**をコピペ可能形式で提供
3. **代替アプローチ**が可能な場合使用（例：ファイル変更用のEdit/Writeツール）

#### 例レスポンスパターン:

````
⚠️ 直接ファイル削除の権限が拒否されました。

以下のコマンドを手動で実行してください:

```bash
rm docs/environment-setup.md
rm docs/ja/environment-setup.md
rm docs/ja/basic-design.md
rm docs/ja/detailed-design.md
````

代替として、Editツールを使用してファイルをDEPRECATEDとしてマークできます。

```
#### 代替アプローチ:

- **ファイル削除**: Edit/WriteでDEPRECATEDプレースホルダーを作成
- **ファイル移動**: Read + Writeで新しい場所にコンテンツをコピー
- **ディレクトリ操作**: 明確な説明付きで手動コマンドを提供
- **Git操作**: ユーザー実行用のコマンドを常に提供

### コマンド形式要件:

- `bash`構文ハイライト付きの適切なコードブロックを使用
- 各コマンドの動作を明確に説明
- 関連するコマンドをグループ化
- 該当する場合は検証コマンドを提供
```

- 'deno fmtでドキュメントとコードを書く'ことを記憶
