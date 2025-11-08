import { Ticket } from '@/domain/entities/Ticket.ts';
import { ISiteScrapingService } from '@/infrastructure/services/scraping/shared/interfaces/index.ts';
import { JLeagueRawTicketData } from './types/JLeagueTypes.ts';
import { IPage } from '@/application/interfaces/clients/IPlaywrightClient.ts';
import { J_LEAGUE_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/jleague/JLeagueConfig.ts';
import { JLeagueDataExtractor } from './extractor/JLeagueDataExtractor.ts';
import { JLeagueDataParser } from './parser/JLeagueDataParser.ts';
import { IBrowserManager } from '@/application/interfaces/clients/IBrowserManager.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import type { ElementHandle } from 'playwright';

/**
 * J-League統合スクレイピングサービス
 */
export class JLeagueScrapingService implements ISiteScrapingService {
  readonly serviceName = 'J-League';

  private readonly dataExtractor: JLeagueDataExtractor;
  private readonly dataParser: JLeagueDataParser;
  private readonly browserManager: IBrowserManager;

  constructor(browserManager: IBrowserManager) {
    this.dataExtractor = new JLeagueDataExtractor(
      J_LEAGUE_SCRAPING_CONFIG.listPage,
      J_LEAGUE_SCRAPING_CONFIG.detailBaseUrl,
    );
    this.dataParser = new JLeagueDataParser();
    this.browserManager = browserManager;
  }

  async collectTickets(): Promise<Ticket[]> {
    CloudLogger.info('Starting ticket collection', {
      category: LogCategory.TICKET_COLLECTION,
      context: {
        stage: 'service_start',
      },
      metadata: {
        source: 'jleague',
      },
    });

    await this.browserManager.launch(J_LEAGUE_SCRAPING_CONFIG.timeouts.pageLoad);
    try {
      const page = await this.browserManager.createPage(
        J_LEAGUE_SCRAPING_CONFIG.timeouts.elementWait,
      );
      await this.configurePage(page);

      // J-Leagueサイトにアクセス
      await this.browserManager.navigateToPage(page, J_LEAGUE_SCRAPING_CONFIG.baseUrl);

      await this.waitForTicketContent(page);

      // 一覧ページで基本情報を取得
      const basicTickets = await this.dataExtractor.extractTickets(page);

      // 詳細ページで情報を補強
      const detailedTickets = await this.enrichWithDetailedInfo(page, basicTickets);

      // 統一されたTicket[]に変換
      const tickets = await this.dataParser.parseMultipleToTickets(detailedTickets);

      this.dataExtractor.getAndClearWarnings();

      CloudLogger.info('Ticket collection completed', {
        category: LogCategory.TICKET_COLLECTION,
        context: {
          stage: 'service_complete',
        },
        metadata: {
          source: 'jleague',
          totalCollected: tickets.length,
        },
      });

      return tickets;
    } finally {
      await this.browserManager.close();
    }
  }

  private async configurePage(page: IPage): Promise<void> {
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
    });

    await page.setViewportSize({ width: 1280, height: 720 });
  }

  private async waitForTicketContent(page: IPage): Promise<void> {
    await this.browserManager.waitForContent(
      page,
      J_LEAGUE_SCRAPING_CONFIG.listPage.selectors.ticketContainer,
      3000,
    );
  }

  private async enrichWithDetailedInfo(
    page: IPage,
    basicTickets: JLeagueRawTicketData[],
  ): Promise<JLeagueRawTicketData[]> {
    const enrichedTickets: JLeagueRawTicketData[] = [];

    // 全チケットの詳細情報を取得
    for (const ticket of basicTickets) {
      if (!ticket.ticketUrl) {
        continue;
      }

      try {
        // 詳細ページにアクセス
        await this.browserManager.navigateToPage(page, ticket.ticketUrl);

        // 詳細情報を取得
        const detailInfo = await this.extractTicketDetailsFromPage(page);

        // 基本情報と詳細情報をマージ
        const enrichedTicket: JLeagueRawTicketData = {
          ...ticket,
          matchName: detailInfo.enhancedMatchName || ticket.matchName,
          enhancedMatchDateTime: detailInfo.enhancedMatchDateTime,
          competition: detailInfo.competition,
          saleDate: detailInfo.saleDate || undefined,
          ticketTypes: detailInfo.ticketTypes,
        };

        enrichedTickets.push(enrichedTicket);
      } catch {
        // 詳細取得失敗時は基本情報のみで追加
        enrichedTickets.push(ticket);
      }
    }

    // 詳細情報取得後にアウェイ判定を実行
    const filteredTickets = enrichedTickets.filter((ticket) => this.isAwayTicket(ticket));

    return filteredTickets;
  }

  private isAwayTicket(ticket: JLeagueRawTicketData): boolean {
    // 試合名自体に特別キーワード（駐車券、企画チケットなど）が含まれている場合は除外
    const matchNameHasSpecialKeyword = J_LEAGUE_SCRAPING_CONFIG.specialKeywords.some((
      keyword: string,
    ) => ticket.matchName.toLowerCase().includes(keyword.toLowerCase()));

    if (matchNameHasSpecialKeyword) {
      return false;
    }

    // 通常のアウェイ席（ビジター席、アウェイ席、ミックス席）をフィルタリング
    const validAwayTicketTypes = ticket.ticketTypes.filter((ticketType: string) => {
      // 特別席（車椅子席、駐車券など）は除外
      const isSpecialSeat = J_LEAGUE_SCRAPING_CONFIG.specialKeywords.some((keyword: string) =>
        ticketType.toLowerCase().includes(keyword.toLowerCase())
      );

      // アウェイ関連キーワードを含む席種のみ対象
      const isAwayRelated = J_LEAGUE_SCRAPING_CONFIG.awayKeywords.some((keyword: string) =>
        ticketType.toLowerCase().includes(keyword.toLowerCase())
      );

      return !isSpecialSeat && isAwayRelated;
    });

    const hasValidAwaySeats = validAwayTicketTypes.length > 0;

    return hasValidAwaySeats;
  }

  private async extractTicketDetailsFromPage(page: IPage): Promise<{
    saleDate: string | null;
    ticketTypes: string[];
    enhancedMatchName?: string;
    competition?: string;
    enhancedMatchDateTime?: string;
  }> {
    const ticketTypes: string[] = [];
    let saleDate: string | null = null;
    let enhancedMatchName: string | undefined;
    let competition: string | undefined;
    let enhancedMatchDateTime: string | undefined;

    try {
      // 試合名と大会名を取得
      const matchNameElement = await page.$(
        J_LEAGUE_SCRAPING_CONFIG.detailPage.selectors.matchNameAndCompetition,
      );
      if (matchNameElement) {
        const fullText = await matchNameElement.textContent();
        if (fullText?.trim()) {
          const parts = fullText.trim().split('　');
          if (parts[0]?.trim()) {
            enhancedMatchName = parts[0].trim();
          }
          if (parts[1]?.trim()) {
            competition = parts[1].trim();
          }
        }
      }
    } catch (_error) {
      // matchName/competition抽出に失敗した場合のフォールバック処理
    }

    try {
      // 統合日時情報を取得
      const dateTimeElement = await page.$(
        J_LEAGUE_SCRAPING_CONFIG.detailPage.selectors.matchDateTime,
      );
      if (dateTimeElement) {
        const dayElements = await dateTimeElement.$$('.day');
        if (dayElements.length >= 2) {
          const dateText = await dayElements[0].textContent();
          const timeText = await dayElements[1].textContent();
          if (dateText?.trim() && timeText?.trim()) {
            enhancedMatchDateTime = `${dateText.trim()} ${timeText.trim()}`;
          }
        }
      }
    } catch (_error) {
      // datetime抽出に失敗した場合のフォールバック処理
    }

    // ビジター席情報と販売期間を取得
    const visitorSections = await page.$$(
      J_LEAGUE_SCRAPING_CONFIG.detailPage.selectors.visitorSections,
    );
    for (const section of visitorSections) {
      try {
        const sectionTitle = await section.$eval(
          J_LEAGUE_SCRAPING_CONFIG.detailPage.selectors.sectionTitle,
          (el: Element) => el.textContent?.trim() || '',
        ).catch(() => '');

        const isVisitorSection = J_LEAGUE_SCRAPING_CONFIG.awayKeywords.some((keyword: string) =>
          sectionTitle.toLowerCase().includes(keyword.toLowerCase())
        );

        if (isVisitorSection) {
          ticketTypes.push(sectionTitle);

          if (!saleDate) {
            await section.click();
            await page.waitForTimeout(500);

            try {
              const ddElement = await section.evaluateHandle((el: Element) =>
                el.nextElementSibling
              );

              if (ddElement) {
                const salePeriod = await (ddElement as ElementHandle).evaluate((dd: Element) => {
                  const items = Array.from(dd.querySelectorAll('li'));
                  for (const item of items) {
                    const title = item.querySelector('h5')?.textContent || '';
                    if (
                      title.includes('一般発売') || title.includes('一般販売') ||
                      title.includes('発売期間')
                    ) {
                      const period = item.querySelector('.list-items-cts-desc dd');
                      return period?.textContent?.trim() || null;
                    }
                  }
                  return null;
                });

                if (salePeriod) {
                  saleDate = salePeriod;
                }
              }
            } catch {
              // Ignore extraction errors
            }
          }
        }
      } catch {
        continue;
      }
    }

    return {
      saleDate,
      ticketTypes,
      enhancedMatchName,
      competition,
      enhancedMatchDateTime,
    };
  }
}
