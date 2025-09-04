import { ScrapedTicketData } from '@/infrastructure/services/scraping/types/ScrapedTicketData.ts';

/**
 * フィルタリング後の通常アウェイチケットのみのモックデータ
 * 2025年9月3日に取得したJ-League通常アウェイチケット情報（特殊チケット除外済み）
 */
export const mockScrapedTicketData: ScrapedTicketData[] = [
  {
    matchName: '川崎フロンターレ',
    matchDate: '9/7',
    saleDate: '〜09/07(日)21:00',
    saleEndDate: null,
    venue: 'Ｕｖａｎｃｅ　とどろきスタジアム　ｂｙ　Ｆｕｊｉｔｓｕ',
    ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2526198/001',
    ticketTypes: [
      'ビジターＳ指定',
      'ビジターＳＡ指定',
      'ビジターＡ自由',
      '【条件付き】ビジターＳＡ指定',
    ],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date('2025-09-03T06:31:42.187Z'),
    saleStatus: 'on_sale',
  },
  {
    matchName: 'ガンバ大阪',
    matchDate: '9/13',
    saleDate: '〜09/12(金)23:59',
    saleEndDate: null,
    venue: 'パナソニック　スタジアム　吹田',
    ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2527755/001',
    ticketTypes: [
      'カテゴリー４ＦＶミックス',
      'カテゴリー４ミックス',
      'ビジター自由席',
      'カテ４ミックス／アウトレット',
    ],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date('2025-09-03T06:31:42.274Z'),
    saleStatus: 'on_sale',
  },
  {
    matchName: '清水エスパルス',
    matchDate: '9/23',
    saleDate: '〜09/23(火)19:00',
    saleEndDate: null,
    venue: 'ＩＡＩスタジアム日本平',
    ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2528632/001',
    ticketTypes: [
      'ビジター１Ｆ指定席',
      'ビジター２Ｆ指定席',
    ],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date('2025-09-03T06:31:42.375Z'),
    saleStatus: 'on_sale',
  },
  {
    matchName: '東京ヴェルディ',
    matchDate: '9/27',
    saleDate: '〜09/26(金)23:59',
    saleEndDate: null,
    venue: '味の素スタジアム',
    ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2530259/001',
    ticketTypes: [
      'メインSS指定ミックス1階',
      'メインSS指定ミックス2階',
      'メインS指定ミックス1階',
      'メインS指定ミックス2階',
      'サイド指定ミックス1階',
      'サイド指定ミックス2階',
      'ゴール裏ビジター指定1階',
      'ゴール裏ビジター指定2階',
    ],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date('2025-09-03T06:31:42.460Z'),
    saleStatus: 'on_sale',
  },
  {
    matchName: '横浜Ｆ・マリノス',
    matchDate: '10/18',
    saleDate: '〜10/18(土)15:30',
    saleEndDate: null,
    venue: '日産スタジアム',
    ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2529547/001',
    ticketTypes: [
      'ビジターサポーターズシート',
    ],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date('2025-09-03T06:31:42.533Z'),
    saleStatus: 'on_sale',
  },
];

// 全て有効データ（通常のアウェイチケットのみ、特殊チケットは既に除外済み）
export const validScrapedTicketData: ScrapedTicketData[] = mockScrapedTicketData;

// 無効データの例（テスト用）
export const invalidScrapedTicketData: ScrapedTicketData[] = [
  {
    matchName: '【駐車券】ガンバ大阪対浦和レッズ',
    matchDate: '9/13',
    saleDate: null, // 販売日時なし
    saleEndDate: null,
    venue: 'パナソニック　スタジアム　吹田',
    ticketUrl: 'https://www.jleague-ticket.jp/sales/perform/2527757/001',
    ticketTypes: [],
    homeTeam: null,
    awayTeam: null,
    scrapedAt: new Date('2025-09-03T06:31:42.627Z'),
    saleStatus: 'before_sale',
  },
];
