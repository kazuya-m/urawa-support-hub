import { ScrapedTicketData } from './types/ScrapedTicketData.ts';
import { JLeagueTicketScraper } from './sources/jleague/JLeagueTicketScraper.ts';
import { ScrapedDataTransformer } from './transformation/ScrapedDataTransformer.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';

export class TicketCollectionService {
  private jleagueScraper: JLeagueTicketScraper;

  constructor() {
    this.jleagueScraper = new JLeagueTicketScraper();
  }

  async collectAllTickets(): Promise<Ticket[]> {
    const allScrapedTickets: ScrapedTicketData[] = [];

    try {
      const jleagueTickets = await this.jleagueScraper.scrapeTickets();
      allScrapedTickets.push(...jleagueTickets);
    } catch (error) {
      console.error('J-League ticket scraping error:', error);
    }

    const transformResult = await ScrapedDataTransformer.transform(allScrapedTickets);

    if (transformResult.skippedTickets.length > 0) {
      console.log(
        `[INFO] ${transformResult.skippedTickets.length} tickets were skipped during transformation`,
      );
      transformResult.skippedTickets.forEach((skipped) => {
        console.log(`[SKIP] ${skipped.matchName}: ${skipped.reason}`);
      });
    }

    return transformResult.tickets;
  }
}
