/**
 * 一覧ページ固有の設定
 */
export interface JLeagueListPageConfig {
  selectors: {
    ticketContainer: string[];
    matchTitle: string[];
    matchDate: string[];
    matchTime: string[];
    venue: string[];
    ticketLink: string[];
    awayTab: string[];
    saleStatusDisplay: string[];
  };
}

/**
 * 詳細ページ固有の設定
 */
export interface JLeagueDetailPageConfig {
  selectors: {
    // 試合情報用
    matchNameAndCompetition: string; // '.game-info-ttl'
    matchDateTime: string; // '.game-info-day'
    dateElement: string; // '.day:first-child'
    timeElement: string; // '.day:nth-child(2)'
    // 新DOM構造用（2026年1月〜）
    listWrap: string; // '.list-wrap'
    infoScheduleItem: string; // '.info-schedule-list .item'
    scheduleItemTitle: string; // '.title'
    scheduleItemDate: string; // '.date'
    ticketType: string; // '.list-items-cts-desc h5'
  };
}

/**
 * J-League統合設定
 */
export interface JLeagueScrapingConfig {
  baseUrl: string;
  detailBaseUrl: string;
  listPage: JLeagueListPageConfig;
  detailPage: JLeagueDetailPageConfig;
  awayKeywords: string[];
  specialKeywords: string[];
  timeouts: {
    pageLoad: number;
    elementWait: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
  };
  competitionNormalization: Record<string, string>;
  urawaTeamNames: {
    primary: string;
    alternatives: string[];
  };
}

export const J_LEAGUE_SCRAPING_CONFIG: JLeagueScrapingConfig = {
  baseUrl: 'https://www.jleague-ticket.jp/club/ur/',
  detailBaseUrl: 'https://www.jleague-ticket.jp',
  listPage: {
    selectors: {
      ticketContainer: [
        '.ticket-tab-child > li:nth-child(2) .game-list > ul > li',
        '.ticket-tab-child > li:last-child .game-list > ul > li',
        '.js-ticket-tab-child > li:nth-child(2) .game-list > ul > li',
      ],
      matchTitle: [
        '.vs-box-vs-place', // フル対戦カードが含まれる可能性の高い親要素
        '.vs-box', // 対戦情報全体のコンテナ
        '.game-title', // 試合タイトル全体
        '.match-info', // 試合情報
        '.vs-box-place .team-name', // 対戦相手チーム名のみ（フォールバック）
        '.vs-box-vs-place p', // 一部情報（フォールバック）
        '[class*="vs"]', // "vs"を含む任意のクラス
        '[class*="match"]', // "match"を含む任意のクラス
        '.team-vs', // チーム対戦情報
      ],
      matchDate: ['.vs-box-info-day'],
      matchTime: ['.vs-box-info-time'],
      venue: [
        '.vs-box-place > span',
        '.vs-box-vs-place > span',
      ],
      ticketLink: ['.vs-box-ticket .ticket-status'],
      awayTab: [
        '.js-ticket-tab li:nth-child(2) span',
        '.ticket-tab li:nth-child(2) span',
        '.js-ticket-tab li:nth-child(2)',
        '.ticket-tab li:nth-child(2)',
      ],
      saleStatusDisplay: [
        '.vs-box-status .comp-status', // 完売表示（例: "空席なし"）
        '.vs-box-status', // フォールバック
      ],
    },
  },
  detailPage: {
    selectors: {
      // 試合情報用
      matchNameAndCompetition: '.game-info-ttl',
      matchDateTime: '.game-info-day',
      dateElement: '.day:first-child',
      timeElement: '.day:nth-child(2)',
      // 新DOM構造用（2026年1月〜）
      listWrap: '.list-wrap',
      infoScheduleItem: '.info-schedule-list .item',
      scheduleItemTitle: '.title',
      scheduleItemDate: '.date',
      ticketType: '.list-items-cts-desc h5',
    },
  },

  awayKeywords: ['アウェイ', 'ビジター', 'ミックス', 'away', 'visitor', 'mix'],
  specialKeywords: [
    '駐車券',
    '駐車',
    'parking',
    '企画チケット',
    '企画席',
    '車椅子',
    '車いす',
    '障がい者',
    '障害者',
    '招待',
    '招待券',
    'VIP',
    'vip',
    'プレミアム',
    'premium',
    'ピッチサイド',
    'pitchside',
    'プレミアムシート',
    'プレミアム席',
    'スイート',
    'suite',
    'バックステージ',
  ],

  timeouts: {
    pageLoad: 45000,
    elementWait: 15000,
  },

  retry: {
    maxRetries: 2,
    baseDelay: 3000,
  },

  competitionNormalization: {
    '明治安田Ｊ１リーグ': 'J1リーグ',
    '明治安田J1リーグ': 'J1リーグ',
    'ＹＢＣルヴァンカップ': 'ルヴァンカップ',
    'JリーグYBCルヴァンカップ': 'ルヴァンカップ',
    'ルヴァンカップ': 'ルヴァンカップ',
    '天皇杯': '天皇杯',
    'ＡＦＣチャンピオンズリーグエリート': 'ACLE',
    'AFCチャンピオンズリーグエリート': 'ACLE',
    'ＡＦＣチャンピオンズリーグ２': 'ACL2',
    'AFCチャンピオンズリーグ2': 'ACL2',
    'AFCチャンピオンズリーグ２': 'ACL2',
    'ACLE': 'ACLE',
    'ACL2': 'ACL2',
  } as const,

  urawaTeamNames: {
    primary: '浦和レッズ',
    alternatives: ['浦和', 'Urawa Reds', 'URAWA'],
  } as const,
};
