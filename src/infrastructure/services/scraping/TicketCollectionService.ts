import { ScrapedTicketData } from './types/ScrapedTicketData.ts';
import { ScrapedDataTransformer } from './transformation/ScrapedDataTransformer.ts';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { ITicketCollectionService } from '@/application/interfaces/services/ITicketCollectionService.ts';
import { ITicketScraper } from '@/application/interfaces/services/ITicketScraper.ts';

export class TicketCollectionService implements ITicketCollectionService {
  constructor(
    private readonly jleagueScraper: ITicketScraper,
  ) {}

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
