# スクレイピング対象サイト構造

セレクタの正本はコード（`JLeagueConfig.ts`・`HiroshimaConfig.ts`）です。サイトの構造が変わったときは、コードとこのドキュメントを合わせて更新します。

## Jリーグチケット

### 1. AWAYタブの構造

`https://www.jleague-ticket.jp/club/ur/`ページに存在するAWAYタブの要素です。
これをクリックして、アウェイゲームの情報を表示します。

```html
<ul class="ticket-tab js-ticket-tab">
  <li class="show-tab"><span>HOME</span></li>
  <li><span>AWAY</span></li>
</ul>
```

### 2. 各試合のチケット購入リンクリスト

アウェイタブに表示される試合のリストの構造。
「チケット購入」ボタンの設定されているリンクに遷移すると、個別の試合のチケット一覧ページが表示される。

```html
<!-- AWAYタブ構造（簡素化版） -->
<ul class="ticket-tab-child js-ticket-tab-child">
  <li class="show-tab-child">
    <div class="game-list">
      <ul>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-j1"></span>明治安田Ｊ１リーグ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <span class="vs-box-info-day c-saturday">9/13</span>
              <span class="vs-box-info-time">19:00</span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">ガンバ大阪</p>
              <span>パナソニック　スタジアム　吹田</span>
            </div>
            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2527755/001">
                チケット購入
              </span>
            </div>
            <div class="vs-box-status">
              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <!-- 他の試合も同様の構造 -->
      </ul>
    </div>
  </li>
</ul>
```

### 3. 個別試合のチケット一覧ページ

試合情報と、席種ごとの発売スケジュールを取得します。セレクタは `src/infrastructure/services/scraping/sources/jleague/JLeagueConfig.ts` の `detailPage.selectors` で管理しています。

| 取得する情報       | セレクタ                                      |
| ------------------ | --------------------------------------------- |
| 試合名・大会名     | `.game-info-ttl`                              |
| 試合日時           | `.game-info-day` 内の `.day`・`.time`         |
| 席種ごとのブロック | `.list-wrap`                                  |
| 席種名             | `.list-wrap` 内の `.list-items-cts-desc h5`   |
| 発売スケジュール   | `.list-wrap` 内の `.info-schedule-list .item` |
| 販売区分           | `.item` 内の `.title`                         |
| 発売日時           | `.item` 内の `.date`                          |

**抽出ルール**:

- 席種名にアウェイキーワード（`アウェイ`・`ビジター`・`ミックス` とその英字表記）を含む `.list-wrap` だけを対象にする
- 販売区分（`.title`）が「一般発売」または「一般販売」の `.date` を発売日時とする（先行販売は除外）
- 発売日時の形式（`JLeagueDataParser.ts` が解釈する）
  - 発売前: `08/15(金)10:00〜`
  - 発売後: `〜09/12(金)23:59`
  - 期間: `08/15(金)10:00〜09/12(金)23:59`

## サンフレッチェ広島公式サイト

`https://www.sanfrecce.co.jp/tickets/schedule` の試合スケジュール表（`tr.cmn--btr` の行）から、浦和レッズ戦の行を取得します。列ごとのセレクタは `src/infrastructure/services/scraping/sources/hiroshima/HiroshimaConfig.ts` の `schedulePageConfig.selectors` で管理しています。
