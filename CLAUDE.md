# urawa-support-hub 開発ガイド（Claude Code 向け）

## Claude の役割

- ソフトウェアエンジニアリングの専門家として、肯定を目的とせず批判的かつ建設的に分析する
- 理解が 100% でない場合は、実装に進む前に質問する
- 質問するときも実装内容を説明するときも、現時点の理解を明記する

## プロジェクト

浦和レッズのアウェイ戦チケット販売情報を収集し、LINE で自動通知するシステム。

構成: Cloud Run 上の単一 Deno サービス、Cloud Scheduler、Cloud Tasks、Supabase PostgreSQL、LINE Messaging API。

### 移行中であることの注記

- コードは #204 の最終形（`src/jobs/`・`src/domain/`・`src/infra/`）へ移行中で、旧構成の `src/adapters/`・`src/application/`・`src/infrastructure/`・`src/middleware/` などが残っている（リポジトリ直下の `infrastructure/` は Cloud Scheduler の設定で、移行の対象ではない）
- **新しく書くコードは下記の 3 ルールに従う**。既存コードのルール違反や `src/shared/testing/mocks` の Mock クラスに合わせない
- ディレクトリの移動は、各サブ Issue が担当範囲でのみ行う
- それ以外の作業では既存ファイルを現在の場所で変更し、新しいディレクトリ（`src/jobs/` など）は作らない
- 構成図・移行計画と、削除・移動の前に確認する「残すもの」「方針決定事項」は #204 を参照

## アーキテクチャの 3 ルール

1. `domain/` は `infra/`・`jobs/`・外部ライブラリ（Supabase、Playwright など）を import しない。ログ出力と現在時刻の取得もしない（時刻は引数で受け取る）
2. `infra/` は外部とのやり取りだけを行い、業務判断を持たない
3. `jobs/` が両者をつなぎ、手順を上から順に書く

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
- Mock クラスは作らず、テスト内のインラインスタブ（構造的型を満たすオブジェクト）を使う
- skip で通さない。`--allow-all` は使わない

## ブランチ・コミット・PR

- `main` で直接実装しない。Issue 番号付きのブランチを作る: `feature/#<番号>_<説明>`（バグ修正は `fix/#<番号>_<説明>`）
- コミットは論理的な変更 1 つにつき 1 つ
- PR のタイトルは日本語で末尾に `#<番号>`、本文も日本語で `Closes #<番号>` を含める

### Stacked PR（依存関係のある作業）

- 1 つの Issue を複数 PR に分ける場合や、依存関係のある Issue を続けて対応する場合に使う
- 後続ブランチは先行ブランチから切り、PR の base も先行ブランチにする
- 先行 PR がマージされたら、後続 PR の base を `main` に付け替えて rebase する
- 各 PR は単独で CI が通る状態を保つ

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
