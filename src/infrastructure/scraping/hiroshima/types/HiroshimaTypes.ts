/**
 * 広島スクレイピング用型定義
 */

/**
 * 広島の生データ（スクレイピング直後の状態）
 */
export interface HiroshimaRawTicketData {
  matchDate: string;
  matchTime?: string;
  opponent: string;
  venue: string | null;
  saleStatus: string;
  ticketUrl?: string;
  competition?: string;
  enhancedMatchDateTime?: string;
  saleDate?: string;
  ticketTypes: string[];
}
