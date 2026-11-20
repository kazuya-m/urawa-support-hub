# urawa-support-hub 開発ガイド（Claude Code 向け）

## Claude の役割

- ソフトウェアエンジニアリングの専門家として、肯定を目的とせず批判的かつ建設的に分析する
- 理解が 100% でない場合は、実装に進む前に質問する
- 質問するときも実装内容を説明するときも、現時点の理解を明記する

## プロジェクト

浦和レッズのアウェイ戦チケット販売情報を収集し、LINE で自動通知するシステム。

構成: Cloud Run 上の単一 Deno サービス、Cloud Scheduler、Cloud Tasks、Supabase PostgreSQL、LINE Messaging API。

### 移行中であることの注記

- コードは #204 の最終形（`src/entrypoints/`・`src/usecases/`・`src/domain/`・`src/infra/`）へ移行中で、`src/entrypoints/`・`src/usecases/` は移行済み。旧構成の `src/infrastructure/`・`src/middleware/` などが残っている（リポジトリ直下の `infrastructure/` は Cloud Scheduler の設定で、移行の対象ではない）
- **新しく書くコードは下記の 3 ルールに従う**。既存コードのルール違反に合わせない
- ディレクトリの移動は、各サブ Issue が担当範囲でのみ行う
- それ以外の作業では既存ファイルを現在の場所で変更し、新しいディレクトリ（`src/infra/` など）は作らない
- 構成図・移行計画と、削除・移動の前に確認する「残すもの」「方針決定事項」は #204 を参照

## アーキテクチャの 3 ルール

1. `domain/` は `infra/`・`usecases/`・`entrypoints/`・外部ライブラリ（Supabase、Playwright など）を import しない。ログ出力と現在時刻の取得もしない（時刻は引数で受け取る）
2. `infra/` は外部とのやり取りだけを行い、業務判断を持たない
3. `usecases/` が両者をつなぎ、手順を上から順に書く。`infra/` は型だけを参照し、具象の生成は `entrypoints/` の入口で行う

- 状態を持つ `infra/` の部品は class、状態を持たない処理（`domain/` の判断、usecase、controller、runJob）は関数で書く

## 必須コマンド

コミット前に次を順に実行し、すべて成功させる。

```bash
deno fmt
deno task pre-commit                              # deno check src/ + deno lint + deno fmt --check
deno test src/ --allow-env --allow-net=127.0.0.1  # 単体テスト
```

- DB を読み書きする変更では `tests/integration/` に統合テストを書く。統合テストは Supabase が必要なので CI で実行される。クラウドセッションでは実行せず、PR の CI 結果で確認する
- `deno task pre-commit` の型チェックは `src/` のみ
- export しているものを削除・改名・型変更したときは `deno check tests/ scripts/` も実行し、`main` で実行した結果からエラーが増えていないことを確認する

## テストの最小ルール

- 対象ファイルと同じ階層の `__tests__/<対象ファイル名>.test.ts` に置く
- Mock クラスは作らず、テスト内のインラインスタブを使う。スタブはキャスト（`as unknown as T` など）せずに型を満たす
- そのため、依存の型は使う側が必要なメソッドだけを宣言する（例: `Pick<TicketRepository, 'findById'>`）。インターフェースのファイルは作らない
- 入口（`src/entrypoints/service/main.ts`、`src/entrypoints/job/` の runJob 以外）は import しない。入口は依存の具象を生成し、Playwright など権限の要るモジュールを読み込むため
- skip で通さない。`--allow-all` は使わない

## コメント

- 実装を説明するコメントは書かない。次のものはすべて含む
  - コードの言い換え（`// 1. チケットを取得する` など）
  - 作業の経緯や理由（「移行前のまま」「#xxx で直す」など）。Issue と PR に書く
  - 回避策の説明。構造で解決する
  - 関数の契約や挙動の説明（JSDoc を含む）。名前・型・テストで表す
- 説明が必要だと感じたら、名前を変えるか関数に分けるか、構造そのものを直す
- 例外: コードからは読み取れない外部の制約（API の仕様、実行環境の競合など）だけは、1 行で書いてよい

## ブランチ・コミット・PR

- `main` で直接実装しない。Issue 番号付きのブランチを作る: `feature/#<番号>_<説明>`（バグ修正は `fix/#<番号>_<説明>`）
- コミットは論理的な変更 1 つにつき 1 つ
- PR のタイトルは日本語で末尾に `#<番号>`、本文も日本語で `Closes #<番号>` を含める

### Stacked PR（依存関係のある作業）

- 1 つの Issue を複数 PR に分ける場合や、依存関係のある Issue を続けて対応する場合は、GitHub の Stacked PR を `gh stack`（`gh extension install github/gh-stack`）で作る
- 各層のブランチ名も上の命名規則に従う。各 PR は単独で CI が通る状態を保つ
- 使うコマンド
  - `gh stack init`: スタックを始める
  - `gh stack add`: 上に層を足す
  - `gh stack submit`: ブランチを push し、PR を作ってスタックにつなげる
  - `gh stack link`: 既にある PR を下から順にスタックにつなげる
  - `gh stack view`: 層・PR・状態を確かめる
  - `gh stack sync`・`gh stack rebase`: 下の層の更新やマージに追従する
  - `gh stack merge`: スタックの PR をマージする
- base の付け替えや rebase を手で行わず、`gh stack` に任せる
- `gh stack` を実行できない環境（クラウドセッションなど）では、下の層のブランチから切って push し、base を下の層のブランチにした PR を作るまでを行う。スタックへのつなぎ込み（`gh stack link`）は依頼する

## ドキュメント索引

| 作業                           | 読むもの                                 |
| ------------------------------ | ---------------------------------------- |
| 環境構築・デプロイ             | `docs/setup-guide.md`                    |
| 権限・RLS・環境変数            | `docs/security/`                         |
| GitHub Secrets の設定          | `docs/github-secrets-setup.md`           |
| 機能要件の確認                 | `docs/requirements.md`                   |
| スクレイピング対象サイトの変更 | `docs/scraping-target-site-structure.md` |
| DB クリーンアップ              | `docs/database-cleanup.md`               |
| 構成図・移行計画               | #204                                     |

- 次の設計ドキュメントは実装と乖離しているため、#215 で書き直すまで参照しない（`docs/ja/` の同名ファイルも同じ）
  - `docs/system-architecture.md`
  - `docs/implementation-guide.md`
  - `docs/clean-architecture-guide.md`
  - `docs/testing-guidelines.md`
  - `docs/logging-specification.md`
- ドキュメントとコード・設定ファイルが食い違う場合は、コードと設定ファイルを正とする
