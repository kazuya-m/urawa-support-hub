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
    available: string[];
    soldOut: string[];
    notStarted: string[];
    ended: string[];
  };
  timeouts: {
    pageLoad: number;
    elementWait: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
  };
  competitionNormalization: Record<string, string>;
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

  // 販売状況キーワード
  saleStatusKeywords: {
    available: ['販売中', '発売中', '購入可能'],
    soldOut: ['完売', '売り切れ', '全席種完売'],
    notStarted: ['販売開始前', '発売前', '販売予定'],
    ended: ['販売終了', '発売終了', '終了'],
  },

  timeouts: {
    pageLoad: 30000,
    elementWait: 10000,
  },

  retry: {
    maxRetries: 2,
    baseDelay: 2000,
  },

  competitionNormalization: {
    'J1リーグ': 'J1リーグ',
    'J1': 'J1リーグ',
    '明治安田Ｊ１リーグ': 'J1リーグ',
    '明治安田J1リーグ': 'J1リーグ',
    'ルヴァンカップ': 'ルヴァンカップ',
    'ＹＢＣルヴァンカップ': 'ルヴァンカップ',
    'JリーグYBCルヴァンカップ': 'ルヴァンカップ',
    '天皇杯': '天皇杯',
    'ＡＦＣチャンピオンズリーグエリート': 'ACLE',
    'AFCチャンピオンズリーグエリート': 'ACLE',
    'ＡＦＣチャンピオンズリーグ２': 'ACL2',
    'AFCチャンピオンズリーグ2': 'ACL2',
    'ACLE': 'ACLE',
    'ACL2': 'ACL2',
  } as const,
};
