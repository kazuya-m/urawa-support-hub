export interface JLeagueScrapingConfig {
  selectors: {
    ticketContainer: string[];
    matchTitle: string[];
    matchDate: string[];
    matchTime: string[];
    venue: string[];
    ticketLink: string[];
  };
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
}

export const J_LEAGUE_SCRAPING_CONFIG: JLeagueScrapingConfig = {
  selectors: {
    ticketContainer: [
      '.ticket-tab-child > li:nth-child(2) .game-list > ul > li',
      '.ticket-tab-child > li:last-child .game-list > ul > li',
      '.js-ticket-tab-child > li:nth-child(2) .game-list > ul > li',
    ],
    matchTitle: [
      '.vs-box-place .team-name',
      '.vs-box-vs-place p',
    ],
    matchDate: ['.vs-box-info-day'],
    matchTime: ['.vs-box-info-time'],
    venue: [
      '.vs-box-place > span',
      '.vs-box-vs-place > span',
    ],
    ticketLink: ['.vs-box-ticket .ticket-status'],
  },

  awayKeywords: ['アウェイ', 'ビジター', 'ミックス', 'away', 'visitor', 'mix'],
  specialKeywords: ['駐車券', '駐車', '企画チケット', '車椅子', '障がい者', 'parking'],

  timeouts: {
    pageLoad: 45000,
    elementWait: 15000,
  },

  retry: {
    maxRetries: 2,
    baseDelay: 3000,
  },
};
