import { ScrapedTicketData } from './types/ScrapedTicketData.ts';
import { JLeagueTicketScraper } from './sources/jleague/JLeagueTicketScraper.ts';
import { ScrapedDataTransformer } from './ScrapedDataTransformer.ts';
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

    const ticketEntities = await ScrapedDataTransformer.convertToTicketEntities(allScrapedTickets);

    return ticketEntities;
  }

  async collectFromJLeagueOnly(): Promise<Ticket[]> {
    const scrapedTickets = await this.jleagueScraper.scrapeTickets();
    return await ScrapedDataTransformer.convertToTicketEntities(scrapedTickets);
  }
}
