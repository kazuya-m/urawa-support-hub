import { ScrapingConfig } from './types/ScrapingConfig.ts';

/**
 * 浦和レッズ J-League チケットサイト用スクレイピング設定
 * 実際のサイト構造に基づく具体的なセレクター設定
 */
export const URAWA_SCRAPING_CONFIG: ScrapingConfig = {
  // アウェイタブセレクター
  awayTabSelectors: [
    'ul.js-ticket-tab li:nth-child(2)', // メインセレクター
    'ul.ticket-tab li:nth-child(2)', // フォールバック1
    '.js-ticket-tab li:contains("AWAY")', // フォールバック2
  ],

  // データ抽出用セレクター
  selectors: {
    // 試合コンテナ
    ticketContainer: [
      '.game-list ul li',
      '.game-list li',
      'ul li .vs-box',
    ],

    // 試合タイトル
    matchTitle: [
      '.team-name', // 対戦相手チーム名
      '.vs-box-vs-place p', // 企画チケット用タイトル
      '.vs-box-place .team-name',
    ],

    // 試合日時
    matchDate: [
      '.vs-box-info-day',
      '.vs-box-info .vs-box-info-day',
    ],

    // 販売開始日時（個別チケットページ内）
    saleDate: [
      '.list-items-cts-desc dl dd',
      'dd[style*="display: none"]',
      '.list-items-cts-desc .sale-period',
    ],

    // チケット種別（個別チケットページ内）
    ticketType: [
      '.seat-select-list-txt h4', // 座席カテゴリー名
      '.list-items-cts-desc h5', // 具体的なチケット名
      '.seat-select-list dl dt h4',
    ],

    // 会場情報
    venue: [
      '.vs-box-place span', // 通常試合
      '.vs-box-vs-place span', // 企画チケット
      '.vs-box-place:last-child',
    ],

    // チケット購入リンク
    ticketLink: [
      '.vs-box-ticket .ticket-status',
      '.ticket-status[href]',
      '.vs-box-ticket span[href]',
    ],
  },

  // アウェイチケット判定キーワード
  awayKeywords: [
    'アウェイ',
    'ビジター',
    'ミックス',
    'away',
    'visitor',
    'mix',
  ],

  // 一般販売識別キーワード
  generalSaleKeyword: '一般発売',

  // タイムアウト設定
  timeouts: {
    pageLoad: 45000, // ページ読み込み: 45秒
    elementWait: 15000, // 要素待機: 15秒
    tabSwitch: 3000, // タブ切り替え: 3秒
  },
};
