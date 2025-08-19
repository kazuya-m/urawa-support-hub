import { UrlConfig } from '@/domain/entities/UrlConfig.ts';

/**
 * 浦和レッズ関連URL設定
 * 実際のJ-Leagueチケットサイト情報
 */
export const URAWA_URL_CONFIG: UrlConfig = {
  staticUrls: {
    jleagueTicketBase: 'https://www.jleague-ticket.jp',
    urawaClubPage: 'https://www.jleague-ticket.jp/club/ur/',
    lineApiBase: 'https://api.line.me/v2',
    sitemapUrl: 'https://www.jleague-ticket.jp/sitemap.xml',
  },

  dynamicUrls: {
    urawaAwayTabUrl: 'https://www.jleague-ticket.jp/club/ur/?tab=away',
    fallbackUrls: [
      'https://www.jleague-ticket.jp/club/ur/away',
      'https://www.jleague-ticket.jp/urawa/away',
      'https://www.jleague-ticket.jp/club/ur/#away',
    ],
  },

  environmentUrls: {
    debugUrl: 'http://localhost:3000/debug-scraping',
    webhookUrl: undefined, // 環境変数から取得
  },
};
