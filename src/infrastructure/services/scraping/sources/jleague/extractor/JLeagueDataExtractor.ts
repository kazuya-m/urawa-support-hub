import { IPage } from '@/application/interfaces/clients/IPlaywrightClient.ts';
import { IDataExtractor } from '@/infrastructure/services/scraping/shared/interfaces/IDataExtractor.ts';
import { JLeagueRawTicketData } from '../types/JLeagueTypes.ts';
import { JLeagueListPageConfig } from '@/infrastructure/services/scraping/sources/jleague/JLeagueConfig.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';

/**
 * J-League一覧ページ専用データ抽出器
 * IDataExtractor<JLeagueRawTicketData>を実装
 */
export class JLeagueDataExtractor implements IDataExtractor<JLeagueRawTicketData> {
  private extractionWarnings: string[] = [];

  constructor(
    private config: JLeagueListPageConfig,
    private detailBaseUrl: string,
  ) {}

  async extractTickets(page: IPage): Promise<JLeagueRawTicketData[]> {
    const tickets: JLeagueRawTicketData[] = [];
    const containers = await this.findTicketContainers(page);

    for (const container of containers) {
      try {
        const ticketData = await this.extractSingleTicket(page, container);
        if (ticketData) {
          tickets.push(ticketData);
        }
      } catch (error) {
        CloudLogger.warn('Failed to extract ticket data', {
          category: LogCategory.TICKET_COLLECTION,
          context: {
            stage: 'data_extraction',
          },
          metadata: {
            source: 'jleague',
          },
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    return tickets;
  }

  async extractSingleTicket(
    page: IPage,
    containerSelector: string,
  ): Promise<JLeagueRawTicketData | null> {
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
        ticketUrl = `${this.detailBaseUrl}${ticketUrl}`;
      }

      if (!matchName || !venue || !ticketUrl) {
        const warning =
          `Missing required info: matchName=${matchName}, venue=${venue}, ticketUrl=${ticketUrl}`;
        this.extractionWarnings.push(warning);
        return null;
      }

      if (!matchDate) {
        const warning = `Could not get some info for ${matchName}: matchDate=${matchDate}`;
        this.extractionWarnings.push(warning);
      }

      const scrapedAt = new Date();

      return {
        matchName,
        matchDate: matchDate || null,
        venue,
        ticketUrl,
        ticketTypes: [], // 一覧ページでは空、詳細ページで補強
        scrapedAt,
        // 詳細ページで補強される項目はundefined
        enhancedMatchDateTime: undefined,
        competition: undefined,
        saleDate: undefined,
      };
    } catch {
      return null;
    }
  }

  getAndClearWarnings(): string[] {
    const warnings = [...this.extractionWarnings];
    this.extractionWarnings = [];
    return warnings;
  }

  private async findTicketContainers(page: IPage): Promise<string[]> {
    for (const selector of this.config.selectors.ticketContainer) {
      try {
        const elements = await page.$$(selector);

        if (elements.length > 0) {
          const result: string[] = [];
          for (let i = 1; i <= elements.length; i++) {
            result.push(`${selector}:nth-child(${i})`);
          }
          return result;
        }
      } catch {
        // Ignore extraction errors
      }
    }
    return [];
  }

  private async extractValue(
    page: IPage,
    containerSelector: string,
    selectors: string[],
    extractor: 'text' | 'href' = 'text',
  ): Promise<string | null> {
    for (const selector of selectors) {
      const fullSelector = `${containerSelector} ${selector}`;
      try {
        let value: string | null;
        if (extractor === 'href') {
          value = await page.$eval(
            fullSelector,
            (element: Element) => {
              // Always use getAttribute('href') to get the raw attribute value
              // Avoid element.href which resolves to absolute URL with potential redirect domain
              return element.getAttribute('href');
            },
          );
        } else {
          value = await page.$eval(
            fullSelector,
            (element: Element) => {
              const text = element.textContent?.trim();
              // 連続する空白文字を単一のスペースに置換
              return text ? text.replace(/\s+/g, ' ') : null;
            },
          );
        }
        if (value) {
          return value;
        }
      } catch (_error) {
        // continue to next selector
      }
    }
    return null;
  }
}
