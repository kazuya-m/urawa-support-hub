/**
 * サンフレッチェ広島公式サイト スクレイピング設定
 */
export interface HiroshimaSchedulePageConfig {
  selectors: {
    ticketContainer: string[];
    matchRow: string[];
    matchDate: string[];
    matchTime: string[];
    opponent: string[];
    venue: string[];
    ticketStatus: string[];
    ticketLink: string[];
  };
}

/**
 * サンフレッチェ広島統合設定
 */
export interface HiroshimaScrapingConfig {
  baseUrl: string;
  ticketPurchaseUrl: string;
  schedulePageConfig: HiroshimaSchedulePageConfig;
  awayKeywords: string[];
  urawaKeywords: string[];
  saleStatusKeywords: {
    soldOut: string[];
    ended: string[];
    onSale: string[];
    beforeSale: string[];
  };
  timeouts: {
    pageLoad: number;
    elementWait: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
  };
}

export const HIROSHIMA_SCRAPING_CONFIG: HiroshimaScrapingConfig = {
  baseUrl: 'https://www.sanfrecce.co.jp/tickets/schedule',
  ticketPurchaseUrl: 'https://ticket.sanfrecce.co.jp/',

  schedulePageConfig: {
    selectors: {
      // チケット情報を含む試合行
      ticketContainer: [
        'tr.cmn--btr',
        'table tbody tr',
      ],
      // 個別の試合行
      matchRow: [
        'tr.cmn--btr',
        'tr',
      ],
      // 試合日（1番目のtdから日付部分を抽出：11.9）
      matchDate: [
        'td:first-child p span.font-weight-bold',
        'td:first-child p',
      ],
      // キックオフ時間（1番目のtdから時間部分を抽出：13:00K.O.）
      matchTime: [
        'td:first-child p',
      ],
      // 対戦相手（2番目のtdのimg alt属性）
      opponent: [
        'td:nth-child(2) img',
        'td:nth-child(2) .match--item--vsteam img',
      ],
      // 会場（1番目のtdから会場部分を抽出）
      venue: [
        'td:first-child p',
      ],
      // チケット販売状況（8番目のtd：販売開始前）
      ticketStatus: [
        'td:nth-child(8) span',
        'td:last-child span',
        'td:nth-child(8)',
      ],
      // チケット詳細リンク（7番目のtd：☆☆☆）
      ticketLink: [
        'td:nth-child(7) a',
      ],
    },
  },

  // アウェイ戦識別キーワード
  awayKeywords: ['アウェイ', 'away', 'ビジター', 'visitor'],

  // 浦和レッズ識別キーワード
  urawaKeywords: [
    '浦和',
    'urawa',
    'reds',
    '浦和レッズ',
    'urawa reds',
    '浦和レッドダイヤモンズ',
    'urawa red diamonds',
  ],

  // 販売状況キーワード（「チケット購入」列の表示。2026-11-10 にサイトで確認）
  saleStatusKeywords: {
    // 「販売終了」の代わりに表示される（確認時点ではページ内の HTML コメントにのみ存在）
    soldOut: ['全席種完売'],
    ended: ['販売終了'],
    // 販売中は購入ボタン（ticket.sanfrecce.co.jp へのリンク）の文言
    onSale: ['WEBで購入'],
    beforeSale: ['販売開始前'],
  },

  timeouts: {
    pageLoad: 30000,
    elementWait: 10000,
  },

  retry: {
    maxRetries: 2,
    baseDelay: 2000,
  },
};
