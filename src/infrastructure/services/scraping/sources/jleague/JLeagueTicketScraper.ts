import { Page } from 'npm:playwright@1.40.0';
import { ScrapedTicketData } from '@/infrastructure/services/scraping/types/ScrapedTicketData.ts';
import { URAWA_URL_CONFIG } from '@/infrastructure/config/url.ts';
import { BrowserManager } from '../../shared/BrowserManager.ts';
import { JLeagueDataExtractor } from './JLeagueDataExtractor.ts';
import { J_LEAGUE_SCRAPING_CONFIG } from './JLeagueConfig.ts';

export class JLeagueTicketScraper {
  private browserManager: BrowserManager;
  private dataExtractor: JLeagueDataExtractor;

  constructor() {
    this.browserManager = new BrowserManager();
    this.dataExtractor = new JLeagueDataExtractor({
      selectors: J_LEAGUE_SCRAPING_CONFIG.selectors,
      awayKeywords: J_LEAGUE_SCRAPING_CONFIG.awayKeywords,
      specialKeywords: J_LEAGUE_SCRAPING_CONFIG.specialKeywords,
    });
  }

  async scrapeTickets(): Promise<ScrapedTicketData[]> {
    let retryCount = 0;

    while (retryCount <= J_LEAGUE_SCRAPING_CONFIG.retry.maxRetries) {
      try {
        await this.browserManager.launch(J_LEAGUE_SCRAPING_CONFIG.timeouts.pageLoad);
        const page = await this.browserManager.createPage(
          J_LEAGUE_SCRAPING_CONFIG.timeouts.elementWait,
        );

        await this.browserManager.navigateToPage(page, URAWA_URL_CONFIG.staticUrls.urawaClubPage);
        const contentLoaded = await this.browserManager.waitForContent(
          page,
          J_LEAGUE_SCRAPING_CONFIG.selectors.ticketContainer,
        );

        if (!contentLoaded) {
          console.warn('Ticket content may not have loaded properly');
        }

        const matchList = await this.dataExtractor.extractTickets(page);
        const awayMatches = matchList.filter((match) => this.dataExtractor.isAwayTicket(match));

        const awayTickets: ScrapedTicketData[] = [];
        for (const match of awayMatches) {
          if (!match.ticketUrl) {
            console.warn(`⚠️ ${match.matchName}: Ticket URL not found`);
            continue;
          }

          try {
            await page.goto(match.ticketUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 15000,
            });
            await page.waitForTimeout(3000);
            const ticketInfo = await this.extractTicketDetailsFromPage(page);

            awayTickets.push({
              ...match,
              saleDate: ticketInfo.saleDate,
              ticketTypes: ticketInfo.ticketTypes,
            });
          } catch (error) {
            console.warn(`${match.matchName}: 詳細ページの取得に失敗: ${error}`);
          }
        }

        const warnings = this.dataExtractor.getAndClearWarnings();
        if (warnings.length > 0) {
          console.warn('データ取得時の警告:');
          warnings.forEach((warning) => console.warn(`  - ${warning}`));
        }

        await this.browserManager.close();
        return awayTickets;
      } catch (error) {
        await this.browserManager.close();

        if (retryCount < J_LEAGUE_SCRAPING_CONFIG.retry.maxRetries) {
          retryCount++;
          console.warn(
            `J-Leagueスクレイピング失敗 (試行 ${retryCount}/${
              J_LEAGUE_SCRAPING_CONFIG.retry.maxRetries + 1
            }): ${error}`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, J_LEAGUE_SCRAPING_CONFIG.retry.baseDelay * retryCount)
          );
          continue;
        }

        console.error('J-Leagueチケットスクレイピングエラー:', error);
        throw error;
      }
    }

    throw new Error('Unexpected end of retry loop');
  }

  /**
   * 詳細ページからチケット情報を抽出
   */
  private async extractTicketDetailsFromPage(page: Page): Promise<{
    saleDate: string | null;
    ticketTypes: string[];
  }> {
    try {
      const ticketTypes: string[] = [];
      let saleDate: string | null = null;
      const visitorSections = await page.$$('dt');

      for (const section of visitorSections) {
        try {
          const sectionTitle = await section.$eval(
            '.seat-select-list-txt h4',
            (el) => el.textContent?.trim() || '',
          ).catch(() => '');

          const isVisitorSection = J_LEAGUE_SCRAPING_CONFIG.awayKeywords.some((keyword) =>
            sectionTitle.toLowerCase().includes(keyword.toLowerCase())
          );
          if (isVisitorSection) {
            ticketTypes.push(sectionTitle);

            if (!saleDate) {
              await section.click();
              await page.waitForTimeout(500);
              const ddElement = await section.evaluateHandle((el) => el.nextElementSibling);

              if (ddElement) {
                const salePeriod = await page.evaluate((dd) => {
                  const items = dd.querySelectorAll('li');
                  for (const item of items) {
                    const title = item.querySelector('h5')?.textContent || '';
                    if (title.includes('一般発売') || title.includes('一般販売')) {
                      const period = item.querySelector('.list-items-cts-desc dd');
                      return period?.textContent?.trim() || null;
                    }
                  }
                  return null;
                }, ddElement);

                if (salePeriod) {
                  saleDate = salePeriod;
                }
              }
            }
          }
        } catch (_error) {
          // continue to next section
        }
      }

      return {
        saleDate,
        ticketTypes,
      };
    } catch (_error) {
      return {
        saleDate: null,
        ticketTypes: [],
      };
    }
  }
}
