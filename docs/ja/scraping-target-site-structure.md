## チケット情報取得までの遷移と流れ

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

- 発売前: `08/15(金)10:00〜` 形式
- 発売後: `〜09/12(金)23:59` 形式
- 対象: アウェイ席の「一般販売」発売日時

```html
<!-- チケット詳細構造（簡素化版） -->
<dl>
  <dt>
    <div class="seat-select-list-txt">
      <h4>ビジターＡ自由</h4>
      <p>1750円/枚～4600円/枚</p>
    </div>
  </dt>
  <dd>
    <div class="list-items-cts-desc">
      <h5>一般発売／ＱＲチケット（Ｊチケ）</h5>
      <dl>
        <dt>発売期間</dt>
        <dd>〜09/07(日)21:00</dd>
      </dl>
    </div>
  </dd>
</dl>
```

**重要な抽出ポイント**:

- セレクタ: `.list-items-cts-desc h5` (一般販売判定)
- 発売期間: `dt:contains("発売期間") + dd` (日時抽出)
