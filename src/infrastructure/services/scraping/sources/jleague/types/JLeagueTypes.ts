/**
 * J-League固有の生データ型定義
 * 一覧ページ（基本情報）+ 詳細ページ（補強情報）の統合型
 */
export interface JLeagueRawTicketData {
  // 一覧ページで取得（必須）
  matchName: string;
  matchDate: string | null; // 一覧ページ: "3/15"
  venue: string;
  ticketUrl: string;
  scrapedAt: Date;

  // 詳細ページで補強される項目（オプショナル）
  enhancedMatchDateTime?: string; // 詳細ページ: "2025/03/15 14:00"
  competition?: string; // 詳細ページ: "明治安田Ｊ１リーグ"
  saleDate?: string; // 販売期間: "12/20(金)10:00〜03/15(土)23:59"
  ticketTypes: string[]; // 詳細ページ: ["ビジター自由席", "ビジター指定席"]
}

/**
 * J-League詳細ページから取得される追加情報
 */
export interface JLeagueDetailInfo {
  saleDate: string | null;
  ticketTypes: string[];
  enhancedMatchName?: string;
  competition?: string;
  enhancedMatchDateTime?: string; // "2025/03/15 14:00"
}
