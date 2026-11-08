# urawa-support-hub 開発ガイド（Claude Code 向け）

## Claude の役割

- ソフトウェアエンジニアリングの専門家として振る舞う
- 肯定を目的とせず、批判的かつ建設的な視点で分析する
- 理解が 100% でない場合は、実装に進む前に質問して理解を深める
- 理解が 100% でない場合は、現時点の理解を明記したうえで、その理解に基づく実装内容を説明する

## プロジェクト概要

浦和レッズのアウェイ戦チケット販売情報を収集し、サポーターに LINE で自動通知するシステム。

### 実行構成

| 要素                                             | 役割                                                                                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud Run（単一の Deno サービス、2GiB / 300 秒） | すべての処理を実行する。エンドポイントは `POST /api/collect-tickets`、`POST /api/send-notification`、`POST /api/ticket-summary`、`GET /health` |
| Cloud Scheduler                                  | 毎日 05:00 JST にチケット収集、毎月 1 日 20:00 JST に月次サマリーを起動（`infrastructure/scheduler/config.yaml`）                              |
| Cloud Tasks                                      | 販売開始前の通知を予約し、指定時刻に `/api/send-notification` を呼ぶ                                                                           |
| Supabase PostgreSQL                              | チケットと通知のデータ保存                                                                                                                     |
| LINE Messaging API                               | 通知の配信                                                                                                                                     |

- スクレイピングは Cloud Run 上の Playwright で行う
- 無料枠の範囲で運用する

## アーキテクチャ

**Functional Core, Imperative Shell**（Gary
Bernhardt「Boundaries」2012）を原則とし、ディレクトリはレイヤードの最小構成で表現する。純粋なロジック（core）と外部
I/O（shell）を分け、処理ごとの手順は `jobs/` に置く。

```
src/
├── main.ts               # ルーティングと共通エラーハンドラ
├── jobs/                 # shell: 処理ごとの手順（取得 → core で判断 → 保存・送信）
│   ├── collectTickets.ts
│   ├── sendNotification.ts
│   └── sendSummary.ts
├── domain/               # core: 純粋関数とエンティティ。I/O・ログ・現在時刻の取得を持たない
│   ├── ticket.ts         # 差分検出、マージ、ID 生成
│   ├── notification.ts   # 状態遷移、通知タイミング
│   ├── dates.ts          # 年推定、JST 変換
│   └── parsers/          # サイト固有の「文字列 → チケット」変換
├── infra/                # shell 側の部品: 外部とのやり取りだけ
│   ├── db.ts             # Supabase（Repository 相当）
│   ├── line.ts
│   ├── cloudTasks.ts
│   └── scrapers/         # ブラウザ操作で DOM から文字列を取り出すだけ
├── config/               # 環境変数の読み取り
└── shared/               # ログ・エラーなど横断的なもののみ
```

### 守るルール

1. `domain/` は `infra/`・`jobs/`・外部ライブラリ（Supabase、Playwright など）を import
   しない。ログ出力と現在時刻の取得もしない（時刻は引数で受け取る）
2. `infra/` は外部とのやり取りだけを行い、業務判断を持たない
3. `jobs/` が両者をつなぎ、手順を上から順に書く

### 補足

- インターフェース（`I*`）と多層の委譲は作らない。具象クラス・関数を直接使い、テストでは構造的型のスタブを渡す
- Playwright の `Page` は抽象化せず直接使う。DOM からの取得は `infra/scrapers/`、文字列の解釈は
  `domain/parsers/` に分ける
- 複数サイトの収集は `jobs/collectTickets.ts` が各スクレイパーを `Promise.all` で並列に呼ぶ
- ルール 1 の「外部ライブラリ」に I/O を伴わない純粋なユーティリティ（`domain/` で現在使っている
  `fast-deep-equal`、`date-fns`、`@date-fns/tz`）が含まれるかは未確定。確定するまで既存の利用を除去しない

### 移行中であることについて

- 現在のコードは移行途中で、`adapters/`・`application/`・`infrastructure/`・`middleware/`・`__mocks__/`
  などが残っている。**新しく書くコードは上記の最終形のルールに従う**。移行計画は #204
- 既存コードにはルール違反（`domain/` から `shared/utils/datetime.ts` 経由でロガーを import
  している等）や `src/shared/testing/mocks` の Mock
  クラスが残っている。それに合わせず、新しいコードとテストは最終形のルールで書く（Mock
  クラスの廃止は #208）。既存のテストファイルにケースを足すだけなら既存の Mock
  を使ってよく、そのファイルの Mock を置き換えるのは #208 で行う
- `src/domain/config/NotificationConfig.ts` は通知タイミングの業務ルールで、最終形では
  `domain/notification.ts` の担当になる（環境変数を読む `config/` とは別物）
- ディレクトリの移動は一括では行わず、各サブ Issue
  が自分の担当範囲で行う。担当外のコードを移動・整理しない
- コードを削除・移動する前に、#204 の「残すもの」と「方針決定事項」を確認する

## ドキュメントの参照

- **参照しない**:
  `docs/system-architecture.md`、`docs/implementation-guide.md`、`docs/clean-architecture-guide.md`、`docs/testing-guidelines.md`、`docs/logging-specification.md`（`docs/ja/`
  の同名ファイルを含む）。実装から乖離しており最終形とも異なる。#215
  で書き直すまでは、このファイルとコードを正とする
- **参照してよい**:
  `docs/setup-guide.md`（環境構築・デプロイ）、`docs/security/`（権限・RLS・環境変数）、`docs/requirements.md`、`docs/github-secrets-setup.md`、`docs/database-cleanup.md`、`docs/scraping-target-site-structure.md`（スクレイピング対象サイトの構造）。`docs/ja/`
  に同名ファイルがあるものも同じ扱い
- 参照してよいドキュメントにも、Supabase Edge Functions・Discord
  通知・存在しないファイルなど現在の構成と異なる記述が残っている（#225
  で修正）。実行構成はこのファイルの記載を、細部はコードと設定ファイルを正とする

## 開発フロー

### ブランチ

- `main`: 本番環境用の安定ブランチ。`main` で直接実装しない
- 実装前に Issue 番号付きのブランチを作る: `feature/#<番号>_<説明>`（例:
  `feature/#6_add-pre-commit-hooks`）、バグ修正は `fix/#<番号>_<説明>`

### コミット

- 論理的な変更 1 つにつき 1 コミット（メッセージの言語は日本語・英語どちらでもよい）
  - ✅ 「Ticket 型定義を追加」「TicketRepository の save を実装」
  - ❌ 「チケット管理をすべて実装」

### Stacked PR（依存関係のある作業）

- 1 つの Issue を複数 PR に分ける場合や、依存関係のある Issue（例: #204 配下のサブ
  Issue）を続けて対応する場合は stacked PR を使う
- 後続ブランチは `main` ではなく先行ブランチから切り、PR の base も先行ブランチにする
- 先行 PR がマージされたら、後続 PR の base を `main` に付け替えて rebase する
- 各 PR は単独で CI が通る状態を保つ

## 開発プロセス

コミット前に次を順に実行し、すべて成功させる。

```bash
deno fmt                                            # TypeScript と Markdown を整形
deno task pre-commit                                # deno check src/ + deno lint + deno fmt --check
deno test src/ --allow-env --allow-net=127.0.0.1    # 単体テスト
```

- `deno task pre-commit` の型チェックは `src/` だけが対象。シンボルを削除・改名したときは
  `deno check tests/ scripts/` も実行し、参照の取りこぼしがないか確認する（`scripts/`
  には既存の型エラーが 4 件ある。件数が増えていないことを確認する）
- DB を読み書きする変更では `tests/integration/` に統合テストを書く。統合テストはローカルの Supabase
  が必要なため CI で実行する。クラウドセッションには Supabase がないので実行せず、PR の CI
  結果で確認する
- 統合テストは `tests/utils/test-supabase.ts` の `createTestSupabaseClient()`
  を使い、`cleanupTestData()` や `withTestCleanup()` でテストデータを必ず削除する
- テストが通らない状態でコミット・PR を作らない
- 実装時は異常系のエラーハンドリングを書き、調査に必要な情報をログに残す
- スクレイピング処理を変更する前に、対象サイトの現在の構造を確認する（`docs/scraping-target-site-structure.md`）

## テスト方針

- 単体テストは対象ファイルと同じ階層の `__tests__/` に `<対象ファイル名>.test.ts` として置く
  - 例: `src/domain/entities/Ticket.ts` → `src/domain/entities/__tests__/Ticket.test.ts`
- Mock
  クラスは作らない。依存はテスト内のインラインスタブ（構造的型を満たすオブジェクト）で差し替える
- `domain/` のテストは入力と出力の比較で書く（純粋関数なのでスタブ不要にする）
- 外部サービス（Supabase、LINE、Cloud Tasks、Playwright）は単体テストで呼ばない
- テストを先に書く（TDD）。正常系だけでなく異常系と境界値のケースを含める
- テストケースは観点ごとに分け、巨大な統合テストを作らない
- スタブや差し替えたグローバル（`Deno.env`、`fetch` など）はテストの最後に必ず元に戻す
- 権限は最小限にする（`--allow-env --allow-net=127.0.0.1`）。`--allow-all` は使わない
- テストを skip して通さない

## コードの約束事

- エンティティの任意項目は `?` ではなく明示的な `null`
  で表す（`optional: string | null`）。オブジェクト構造を一定にし、DB の列と揃えるため
- エラー処理は共通のユーティリティ・ハンドラを使い、同じ分岐を各所に複製しない
- 外部依存は最小限にし、上記の実行構成（Cloud Run +
  Supabase）の範囲で解決する。ツールありきではなく「何を実現するか」から検討する

### 通知タイミングの設定駆動

通知タイミングは `src/domain/config/NotificationConfig.ts` の `NOTIFICATION_TIMING_CONFIG`
に集約している。タイミングを変えるときはここだけを変更する。

```typescript
// 設定: 通知タイプごとの表示名と通知時刻の計算
export const NOTIFICATION_TIMING_CONFIG = {
  [NOTIFICATION_TYPES.DAY_BEFORE]: {
    displayName: '販売開始前日',
    // 販売開始日の前日 20:00 JST
    calculateScheduledTime: (saleStartDate: Date): Date =>
      setJSTTimeAndConvertToUTC(saleStartDate, 20, 0, 0, -1),
    // toleranceMs, description も必須（NotificationTimingConfig）
  },
  // HOUR_BEFORE, MINUTES_BEFORE も同じ形
} as const satisfies Record<NotificationType, NotificationTimingConfig>;

// 利用側: 設定を回して通知時刻を求める（個別の時刻を直書きしない）
const timings = Object.entries(NOTIFICATION_TIMING_CONFIG).map(([type, config]) => ({
  type: type as NotificationType,
  scheduledTime: config.calculateScheduledTime(saleStartDate),
}));
```

- 通知時刻の計算や表示名は、この設定を参照して求める。値をコードの他の場所に直書きしない
- 通知タイプを追加するときは `NOTIFICATION_TYPES` と `NOTIFICATION_TIMING_CONFIG`
  の両方に追加する（`satisfies` で漏れが型エラーになる）

## Pull Request

- タイトルは日本語で、末尾に Issue 番号を付ける（例: `pre-commitフック実装（Denoネイティブ）#6`）
- 本文も日本語で書き、`Closes #<番号>` を含める

```markdown
## 概要

- 実装内容の概要

## 実装内容

- 詳細な変更内容

## テスト結果

- pre-commit と単体テストの結果

Closes #6
```

## ドキュメント作成の原則

ドキュメントは実装と運用の唯一の正（マスター）として書く。実装の履歴や移行ガイドにしない。

- 日本語で書き、`deno fmt` で整形する
- **書くこと**: 現在の実装パターンと例、設定の要件と形式、API
  の仕様と使い方、トラブルシューティングと運用手順、セキュリティ要件
- **書かないこと**:
  実装の過程（「まず〜をした」「移行手順」）、経緯や背景の物語、一時的な回避策、開発スケジュールやプロジェクト管理情報

構成例: `# サービス名` の下に `## 設定`・`## 使い方`・`## API リファレンス`・`## セキュリティ`

読み手が「現在のシステムを理解して使う」ために書く。開発の歴史を学ぶためのものにしない。

このファイルの「移行中であることについて」とドキュメント参照の制限は、移行期間中の意図的な例外で、#215
で削除する。

## コマンドが権限で失敗したとき

`rm` などのコマンドが権限制限で失敗した場合:

1. 状況をユーザーに説明する
2. 実行すべきコマンドを `bash`
   のコードブロックでコピーできる形で示す（関連するコマンドをまとめ、確認用コマンドも添える）
3. 可能なら代替手段を使う（ファイル編集は Edit / Write ツール、移動は Read + Write でコピー）

## ナレッジベースへの記録

開発中に再利用できる技術知識を見つけたら、個人のナレッジベースに記録する。

- **保存先**:
  `/Users/kazuyamatsuo/second_brain/30_Resources/SoftwareEngineer/`（ローカル環境のみ。クラウドセッションでは書き込めないので、記録候補を
  PR 本文や最終報告に挙げる）
- **記録するもの**: 外部サービス連携（LINE Bot
  など）、開発ツールとワークフロー、汎用的な実装パターン、セキュリティ設定、よくある問題の解決方法
- **記録しないもの**:
  プロジェクト固有の業務ロジック、文脈に強く依存する実装、一時的な回避策やプロジェクト固有の設定
- **書き方**:
  プロジェクトに依存しない汎用的な内容にし、簡潔で実践的にする。技術的な前提知識は省略してよい
- **ファイル名**: 技術名がわかる名前にする（例:
  `LINE Messaging API - Bot開発と配信実装.md`）。「完全ガイド」のような語は使わない
- **形式**: Obsidian 形式。frontmatter
  にタグとメタデータを入れ、見出し構造を揃え、関連ドキュメントへのリンクを張る
