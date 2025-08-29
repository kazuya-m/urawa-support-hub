/**
 * 複数ソースから浦和レッズアウェイチケット情報を統合収集するサービス
 * 現在はJ-Leagueチケットのみ対応、将来的にクラブ公式サイトも統合予定
 */

import { ScrapedTicketData } from '@/domain/entities/Ticket.ts';
import { JLeagueTicketScraper } from '@/infrastructure/services/scraping/sources/jleague/JLeagueTicketScraper.ts';

export interface TicketCollectionResult {
  success: boolean;
  totalTickets: number;
  sourceResults: SourceResult[];
  errors: string[];
}

interface SourceResult {
  source: string;
  ticketsFound: number;
  success: boolean;
  error?: string;
}

export class TicketCollectionService {
  private jleagueScraper: JLeagueTicketScraper;

  constructor() {
    this.jleagueScraper = new JLeagueTicketScraper();
  }

  /**
   * 全ソースから浦和レッズアウェイチケット情報を収集
   */
  async collectAllTickets(): Promise<TicketCollectionResult> {
    const sourceResults: SourceResult[] = [];
    const allTickets: ScrapedTicketData[] = [];
    const errors: string[] = [];

    // J-Leagueチケットから収集
    try {
      console.log('J-Leagueチケットサイトからスクレイピング開始...');
      const jleagueTickets = await this.jleagueScraper.scrapeTickets();

      sourceResults.push({
        source: 'J-League Ticket',
        ticketsFound: jleagueTickets.length,
        success: true,
      });

      allTickets.push(...jleagueTickets);
      console.log(`J-Leagueチケット: ${jleagueTickets.length}件のチケット情報を取得`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      sourceResults.push({
        source: 'J-League Ticket',
        ticketsFound: 0,
        success: false,
        error: errorMessage,
      });
      errors.push(`J-Leagueチケット: ${errorMessage}`);
      console.error('J-Leagueチケットスクレイピングエラー:', error);
    }

    // 将来拡張: クラブ公式サイトからも収集
    // TODO: OfficialSiteScraper実装時に追加
    // try {
    //   const officialTickets = await this.officialScraper.scrapeTickets();
    //   sourceResults.push({...});
    //   allTickets.push(...officialTickets);
    // } catch (error) { ... }

    // 重複チケット除去
    const uniqueTickets = this.removeDuplicateTickets(allTickets);
    const totalTickets = uniqueTickets.length;

    const overall_success = sourceResults.some((result) => result.success);

    return {
      success: overall_success,
      totalTickets,
      sourceResults,
      errors,
    };
  }

  /**
   * 複数ソース間でのチケット重複除去
   * 同一試合・同一会場のチケットを統合
   */
  private removeDuplicateTickets(tickets: ScrapedTicketData[]): ScrapedTicketData[] {
    const uniqueMap = new Map<string, ScrapedTicketData>();

    for (const ticket of tickets) {
      const key = this.generateTicketKey(ticket);
      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, ticket);
      } else {
        // より詳細なデータで上書き（チケットタイプや販売日情報がある方を優先）
        const merged = this.mergeTicketData(existing, ticket);
        uniqueMap.set(key, merged);
      }
    }

    return Array.from(uniqueMap.values());
  }

  private generateTicketKey(ticket: ScrapedTicketData): string {
    // 試合名と会場の組み合わせで重複判定
    return `${ticket.matchName.toLowerCase()}_${ticket.venue.toLowerCase()}`;
  }

  private mergeTicketData(
    existing: ScrapedTicketData,
    newData: ScrapedTicketData,
  ): ScrapedTicketData {
    return {
      matchName: existing.matchName,
      matchDate: newData.matchDate || existing.matchDate,
      saleDate: newData.saleDate || existing.saleDate,
      venue: existing.venue,
      ticketUrl: newData.ticketUrl || existing.ticketUrl,
      ticketTypes: [
        ...new Set([
          ...existing.ticketTypes,
          ...newData.ticketTypes,
        ]),
      ],
    };
  }

  /**
   * 特定ソースのみからチケット収集（テスト用）
   */
  async collectFromJLeagueOnly(): Promise<ScrapedTicketData[]> {
    return await this.jleagueScraper.scrapeTickets();
  }
}
