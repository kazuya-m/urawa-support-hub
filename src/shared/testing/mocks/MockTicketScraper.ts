import { ITicketScraper } from '@/application/interfaces/services/ITicketScraper.ts';
import { ScrapedTicketData } from '@/infrastructure/services/scraping/types/ScrapedTicketData.ts';

export class MockTicketScraper implements ITicketScraper {
  public scrapeCallsCount = 0;
  private mockData: ScrapedTicketData[] = [];
  private shouldThrow = false;
  private errorMessage = 'Mock scraper error';

  setMockData(data: ScrapedTicketData[]) {
    this.mockData = data;
  }

  setThrowError(shouldThrow: boolean, message = 'Mock scraper error') {
    this.shouldThrow = shouldThrow;
    this.errorMessage = message;
  }

  async scrapeTickets(): Promise<ScrapedTicketData[]> {
    this.scrapeCallsCount++;

    if (this.shouldThrow) {
      throw new Error(this.errorMessage);
    }

    // Mock処理を待機
    await Promise.resolve();
    return [...this.mockData];
  }

  reset() {
    this.scrapeCallsCount = 0;
    this.mockData = [];
    this.shouldThrow = false;
    this.errorMessage = 'Mock scraper error';
  }
}
