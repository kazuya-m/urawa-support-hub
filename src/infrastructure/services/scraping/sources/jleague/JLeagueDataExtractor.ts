import { Page } from 'npm:playwright@1.40.0';
import { ScrapedTicketData } from '@/infrastructure/services/scraping/types/ScrapedTicketData.ts';
import { parseSaleDate } from '@/domain/entities/SaleStatusUtils.ts';

interface ExtractorConfig {
  selectors: {
    ticketContainer: string[];
    matchTitle: string[];
    matchDate: string[];
    matchTime: string[];
    venue: string[];
    ticketLink: string[];
  };
  awayKeywords: string[];
  specialKeywords: string[];
}

export class JLeagueDataExtractor {
  private extractionWarnings: string[] = [];

  constructor(private config: ExtractorConfig) {}

  async extractTickets(page: Page): Promise<ScrapedTicketData[]> {
    const tickets: ScrapedTicketData[] = [];
    const containers = await this.findTicketContainers(page);

    for (const container of containers) {
      try {
        const ticketData = await this.extractSingleTicket(page, container);
        if (ticketData) {
          tickets.push(ticketData);
        }
      } catch (error) {
        console.warn('Failed to extract ticket data from container:', error);
      }
    }

    return tickets;
  }

  private async findTicketContainers(page: Page): Promise<string[]> {
    for (const selector of this.config.selectors.ticketContainer) {
      try {
        const elements = await page.$$eval(
          selector,
          (elements, sel: string) =>
            elements.map((_, index: number) => `${sel}:nth-child(${index + 1})`),
          selector,
        ) as string[];
        if (elements.length > 0) {
          return elements;
        }
      } catch (_error) {
        // Continue to next selector
      }
    }
    return [];
  }

  private async extractSingleTicket(
    page: Page,
    containerSelector: string,
  ): Promise<ScrapedTicketData | null> {
    try {
      const matchName = await this.extractValue(
        page,
        containerSelector,
        this.config.selectors.matchTitle,
      );
      const matchDate = await this.extractValue(
        page,
        containerSelector,
        this.config.selectors.matchDate,
      );
      const matchTime = await this.extractValue(
        page,
        containerSelector,
        this.config.selectors.matchTime,
      );
      const venue = await this.extractValue(
        page,
        containerSelector,
        this.config.selectors.venue,
      );
      let ticketUrl = await this.extractValue(
        page,
        containerSelector,
        this.config.selectors.ticketLink,
        'href',
      );

      if (ticketUrl && ticketUrl.startsWith('/')) {
        ticketUrl = `https://www.jleague-ticket.jp${ticketUrl}`;
      }

      if (!matchName || !venue || !ticketUrl) {
        const warning =
          `Missing required info: matchName=${matchName}, venue=${venue}, ticketUrl=${ticketUrl}`;
        console.warn(warning);
        this.extractionWarnings.push(warning);
        return null;
      }

      if (!matchDate || !matchTime) {
        const warning =
          `Could not get some info for ${matchName}: matchDate=${matchDate}, matchTime=${matchTime}`;
        console.warn(warning);
        this.extractionWarnings.push(warning);
      }

      const scrapedAt = new Date();
      const saleDate = await this.extractSaleDate(page, containerSelector);
      let saleStatus: 'before_sale' | 'on_sale' | 'ended' | undefined;
      let saleEndDate: string | null = null;

      if (saleDate) {
        try {
          const saleInfo = parseSaleDate(saleDate);
          saleStatus = saleInfo.saleStatus;
          if (saleInfo.saleEndDate) {
            saleEndDate = saleInfo.saleEndDate.toISOString();
          }
        } catch (error) {
          console.warn(`Could not parse sale date "${saleDate}":`, error);
          // saleStatusはundefinedのままにして、パース失敗を明示
        }
      }

      return {
        matchName,
        matchDate: matchDate || null,
        saleDate,
        saleEndDate,
        venue,
        ticketUrl,
        ticketTypes: [],
        homeTeam: null,
        awayTeam: null,
        scrapedAt,
        saleStatus,
      };
    } catch (error) {
      console.warn('Failed to extract single ticket data:', error);
      return null;
    }
  }

  private async extractValue(
    page: Page,
    containerSelector: string,
    selectors: string[],
    extractor: 'text' | 'href' = 'text',
  ): Promise<string | null> {
    for (const selector of selectors) {
      const fullSelector = `${containerSelector} ${selector}`;
      try {
        const value = await page.$eval(
          fullSelector,
          (element, type) => {
            if (type === 'href') {
              return element.getAttribute('href') || element.href || null;
            }
            return element.textContent?.trim() || null;
          },
          extractor,
        ) as string | null;
        if (value) {
          return value;
        }
      } catch (_error) {
        // continue to next selector
      }
    }
    return null;
  }

  isAwayTicket(ticket: ScrapedTicketData): boolean {
    const textToCheck = `${ticket.matchName} ${ticket.venue} ${ticket.ticketTypes.join(' ')}`
      .toLowerCase();

    const isSpecial = this.config.specialKeywords.some((keyword) =>
      textToCheck.includes(keyword.toLowerCase())
    );
    if (isSpecial) {
      return false;
    }

    const homeKeywords = ['埼玉スタジアム', 'さいたま', 'saitama'];
    const isHome = homeKeywords.some((keyword) =>
      ticket.venue.toLowerCase().includes(keyword.toLowerCase())
    );
    if (isHome) {
      return false;
    }

    return true;
  }

  private async extractSaleDate(page: Page, containerSelector: string): Promise<string | null> {
    const saleSelectors = [
      '.sale-date',
      '.ticket-sale-date',
      '.sale-info',
      '[class*="sale"]',
      '[class*="date"]',
    ];

    for (const selector of saleSelectors) {
      const fullSelector = `${containerSelector} ${selector}`;
      try {
        const saleDate = await page.$eval(
          fullSelector,
          (element) => element.textContent?.trim() || null,
        ) as string | null;
        if (saleDate) {
          return saleDate;
        }
      } catch (_error) {
        // continue to next selector
      }
    }
    return null;
  }

  getAndClearWarnings(): string[] {
    const warnings = [...this.extractionWarnings];
    this.extractionWarnings = [];
    return warnings;
  }
}
