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