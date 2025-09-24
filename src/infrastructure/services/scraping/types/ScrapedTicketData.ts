/**
 * J-Leagueサイトからスクレイピングで取得されるチケット情報
 * Infrastructure層の技術的な契約として定義
 */
import type { SaleStatus } from '@/domain/types/SaleStatus.ts';
export interface ScrapedTicketData {
  matchName: string;
  matchDate: string | null; // 統合日時（例: "2025/09/20 19:00"）または日付のみ（例: "5/15"）
  competition?: string | null; // 大会名（例: "明治安田Ｊ１リーグ"）
  saleDate: string | null; // 販売開始日時（詳細ページから取得、取得できない場合はnull）
  saleEndDate?: string | null; // 販売終了日時（販売中の場合に存在）
  ticketTypes: string[];
  ticketUrl: string;
  venue: string;
  homeTeam: string | null; // ホームチーム（取得できない場合はnull）
  awayTeam: string | null; // アウェイチーム（取得できない場合はnull）
  scrapedAt: Date; // スクレイピング実行時刻
  saleStatus?: SaleStatus; // 販売状態（スクレイピング失敗時はundefined）
}
