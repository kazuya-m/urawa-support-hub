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
<ul class="ticket-tab-child js-ticket-tab-child">
  <li style="display: none" class="">
    <!--ホームここから-->
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
              <div>
                <span class="vs-box-info-day c-holiday">8/31</span>
                <span class="vs-box-info-time">19:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/an_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">アルビレックス新潟</p>
              <span>埼玉スタジアム２００２</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2521601/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-rv"></span>ルヴァンカップ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day">9/3</span>
                <span class="vs-box-info-time">19:30</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/kf_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">川崎フロンターレ</p>
              <span>埼玉スタジアム２００２</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2525181/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-j1"></span>明治安田Ｊ１リーグ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">9/20</span>
                <span class="vs-box-info-time">19:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/ka_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">鹿島アントラーズ</p>
              <span>埼玉スタジアム２００２</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2527158/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-j1"></span>明治安田Ｊ１リーグ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">10/4</span>
                <span class="vs-box-info-time">17:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/vi_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">ヴィッセル神戸</p>
              <span>埼玉スタジアム２００２</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2529062/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-j1"></span>明治安田Ｊ１リーグ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">10/25</span>
                <span class="vs-box-info-time">14:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/mz_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">ＦＣ町田ゼルビア</p>
              <span>埼玉スタジアム２００２</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2529621/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <!--ホームここまで-->
  </li>
  <li style="" class="show-tab-child">
    <!--アウェイここから-->
    <div class="game-list">
      <ul>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-rv"></span>ルヴァンカップ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-holiday">9/7</span>
                <span class="vs-box-info-time">19:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/kf_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">川崎フロンターレ</p>
              <span>Ｕｖａｎｃｅ　とどろきスタジアム　ｂｙ　Ｆｕｊｉｔｓｕ</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2526198/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-j1"></span>明治安田Ｊ１リーグ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">9/13</span>
                <span class="vs-box-info-time">19:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/go_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">ガンバ大阪</p>
              <span>パナソニック　スタジアム　吹田</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2527755/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-j1"></span>明治安田Ｊ１リーグ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-holiday">9/23</span>
                <span class="vs-box-info-time">18:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/ss_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">清水エスパルス</p>
              <span>ＩＡＩスタジアム日本平</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2528632/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-j1"></span>明治安田Ｊ１リーグ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">9/27</span>
                <span class="vs-box-info-time">18:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/vn_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">東京ヴェルディ</p>
              <span>味の素スタジアム</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2530259/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-j1"></span>明治安田Ｊ１リーグ
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">10/18</span>
                <span class="vs-box-info-time">14:00</span>
              </div>
            </div>
            <div class="vs-box-vs">
              <span>
                <img src="/img/club/img/ym_l.png" alt="">
              </span>
            </div>
            <div class="vs-box-place">
              <p class="team-name">横浜Ｆ・マリノス</p>
              <span>日産スタジアム</span>
            </div>

            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2529547/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_vacant.png" alt="">

              <div class="comp-status bg-vacant">空席あり</div>
            </div>
          </div>
        </li>
        <li class="bg-none">
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-ot"></span>その他
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">9/13</span>
                <span class="vs-box-info-time">19:00</span>
              </div>
            </div>

            <div class="vs-box-vs-place">
              <p>【駐車券】ガンバ大阪対浦和レッズ</p>
              <span>パナソニック　スタジアム　吹田</span>
            </div>
            <div class="vs-box-ticket">
              <!-- リセール -->

              <span class="ticket-status vacant" href="/sales/perform/2527757/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <!-- リセール -->

              <img src="/img/ico_few.png" alt="">

              <!-- リセール -->

              <div class="comp-status bg-few">空席わずか</div>
            </div>
          </div>
        </li>
        <li class="bg-none">
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-ot"></span>その他
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-holiday">9/23</span>
                <span class="vs-box-info-time">18:00</span>
              </div>
            </div>

            <div class="vs-box-vs-place">
              <p>清水エスパルス対浦和レッズ　企画チケット／車椅子・障がい者席／駐車券</p>
              <span>ＩＡＩスタジアム日本平</span>
            </div>
            <div class="vs-box-ticket">
              <span class="ticket-status no" href="/sales/perform/2528899/001">チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_no.png" alt="">

              <div class="comp-status bg-no">空席なし</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-ot"></span>その他
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">9/27</span>
                <span class="vs-box-info-time">18:00</span>
              </div>
            </div>

            <div class="vs-box-vs-place">
              <p>東京ヴェルディ対浦和レッズ【車いす／ピッチサイド／駐車券】</p>
              <span>味の素スタジアム</span>
            </div>
            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2530260/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_few.png" alt="">

              <div class="comp-status bg-few">空席わずか</div>
            </div>
          </div>
        </li>
        <li>
          <div class="comp">
            <div class="comp-ttk">
              <span class="bg-ot"></span>その他
            </div>
          </div>
          <div class="vs-box">
            <div class="vs-box-info">
              <div>
                <span class="vs-box-info-day c-saturday">10/18</span>
                <span class="vs-box-info-time">14:00</span>
              </div>
            </div>

            <div class="vs-box-vs-place">
              <p>横浜Ｆ・マリノス対浦和レッズ　〈駐車券・車椅子〉</p>
              <span>日産スタジアム</span>
            </div>
            <div class="vs-box-ticket">
              <span class="ticket-status vacant" href="/sales/perform/2529548/001"
              >チケット購入</span>
            </div>
            <div class="vs-box-status">
              <img src="/img/ico_few.png" alt="">

              <div class="comp-status bg-few">空席わずか</div>
            </div>
          </div>
        </li>
      </ul>
    </div>
    <!--アウェイここまで-->
  </li>
</ul>
```

### 3. 個別試合のチケット一覧ページ

- 発売前のチケットは `08/15(金)10:00〜`の形式で表示される。
- 発売後のチケットは`〜09/12(金)23:59`の形式で表示される
- アウェイ席に分類されるチケット種別のうち、一番最初の要素から、「一般販売」と表記されている発売日時をが対象

以下はチケットリストの１要素

```html
<dl>
  <dt>
    <div class="seat-select-list-img bg-vacant">
      <img src="/img/ico_vacant2.png" alt="">
    </div>

    <div class="seat-select-list-txt">
      <h4>ビジターＡ自由</h4>
      <p>1750円/枚～4600円/枚</p>
    </div>
    <div class="opener"></div>
  </dt>
  <dd style="display: none">
    <div class="list-items">
      <p class="list-items-ttl">ゴール裏1階南 立見</p>
      <div class="list-items-cts">
        <ul>
          <li class="vacant">
            <a href="javascript:void(0);" data-select="assign-a" class="nolink" onclick="">
              <img src="/img/ico_vacant.png" alt="">
              <div class="list-items-cts-desc">
                <h5>一般発売／ＱＲチケット（Ｊチケ）</h5>
                <p>
                  1750円/枚～4600円/枚&nbsp; &nbsp;&nbsp;
                </p>
                <dl>
                  <dt>発売期間</dt>
                  <dd style="display: none">〜09/07(日)21:00</dd>
                </dl>
              </div>
              <div class="list-items-cts-ticket">
                <span
                  class="ticket-status js-modalOn"
                  data-select="assign-a"
                  onclick="modalOn(this, '20', '013', 'A63', '2526198', '001', 'S041', '49', false)"
                >選択する</span>
              </div>
            </a>
          </li>

          <li class="vacant">
            <a href="javascript:void(0);" data-select="assign-a" class="nolink" onclick="">
              <img src="/img/ico_vacant.png" alt="">
              <div class="list-items-cts-desc">
                <h5>一般発売／店頭発券（Ｊチケ）</h5>
                <p>
                  1750円/枚～4600円/枚&nbsp; &nbsp;&nbsp;
                </p>
                <dl>
                  <dt>発売期間</dt>
                  <dd style="display: none">〜09/07(日)21:00</dd>
                </dl>
              </div>
              <div class="list-items-cts-ticket">
                <span
                  class="ticket-status js-modalOn"
                  data-select="assign-a"
                  onclick="modalOn(this, '20', '014', 'A63', '2526198', '001', 'S041', '49', false)"
                >選択する</span>
              </div>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </dd>
</dl>
```
