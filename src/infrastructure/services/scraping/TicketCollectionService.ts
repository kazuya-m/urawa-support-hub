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

  async collectAllTickets(): Promise<TicketCollectionResult> {
    const sourceResults: SourceResult[] = [];
    const allTickets: ScrapedTicketData[] = [];
    const errors: string[] = [];

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

  private removeDuplicateTickets(tickets: ScrapedTicketData[]): ScrapedTicketData[] {
    const uniqueMap = new Map<string, ScrapedTicketData>();

    for (const ticket of tickets) {
      const key = this.generateTicketKey(ticket);
      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, ticket);
      } else {
        const merged = this.mergeTicketData(existing, ticket);
        uniqueMap.set(key, merged);
      }
    }

    return Array.from(uniqueMap.values());
  }

  private generateTicketKey(ticket: ScrapedTicketData): string {
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

  async collectFromJLeagueOnly(): Promise<ScrapedTicketData[]> {
    return await this.jleagueScraper.scrapeTickets();
  }
}
