import { ScrapedTicketData } from '@/domain/entities/Ticket.ts';
import { ScrapingConfig } from '@/domain/entities/ScrapingConfig.ts';
import { UrlConfig } from '@/domain/entities/UrlConfig.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

import { Browser, chromium, Page } from 'npm:playwright@1.40.0';

// DOM types for Deno
interface Element {
  textContent: string | null;
  classList: {
    contains(className: string): boolean;
  };
  getAttribute(name: string): string | null;
  parentElement: Element | null;
}

interface HTMLAnchorElement extends Element {
  href: string;
}

export class ScrapingService {
  private browser: Browser | null = null;

  constructor(
    private config: ScrapingConfig,
    private urlConfig: UrlConfig,
  ) {}

  async scrapeAwayTickets(): Promise<ScrapedTicketData[]> {
    try {
      await this.initializeBrowser();
      const page = await this.createPage();

      // ベースURLに移動
      await this.navigateToPage(page, this.urlConfig.staticUrls.urawaClubPage);

      // アウェイタブをクリックして状態を切り替え
      await this.switchToAwayTab(page);

      // アウェイタブのコンテンツが読み込まれるまで待機
      await this.waitForAwayTabContent(page);

      const tickets = await this.extractTicketData(page);
      const awayTickets = this.filterAwayTickets(tickets);

      await this.cleanup();
      return awayTickets;
    } catch (error) {
      await this.cleanup();
      handleSupabaseError('scrape away tickets', error as Error);
      throw error;
    }
  }

  private async initializeBrowser(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      timeout: this.config.timeouts.pageLoad,
    });
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    page.setDefaultTimeout(this.config.timeouts.elementWait);

    return page;
  }

  private async navigateToPage(page: Page, url: string): Promise<void> {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
  }

  private async switchToAwayTab(page: Page): Promise<void> {
    let tabClicked = false;

    // 複数のセレクター候補でアウェイタブを探してクリック
    for (const selector of this.config.awayTabSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: this.config.timeouts.elementWait });

        // タブが既にアクティブかチェック
        const isActive = await page.$eval(selector, (element: Element) => {
          return element.classList.contains('active') ||
            element.getAttribute('aria-selected') === 'true' ||
            element.parentElement?.classList.contains('active');
        }).catch(() => false) as boolean;

        if (!isActive) {
          await page.click(selector);
          await page.waitForTimeout(this.config.timeouts.tabSwitch);
        }

        tabClicked = true;
        break;
      } catch (_error) {
        console.warn(`Away tab selector failed: ${selector}`);
      }
    }

    if (!tabClicked) {
      throw new Error('Could not find or click away tab');
    }
  }

  private async waitForAwayTabContent(page: Page): Promise<void> {
    // アウェイタブのコンテンツが表示されるまで待機
    // JavaScript状態管理によるコンテンツ切り替えを待つ
    await page.waitForLoadState('networkidle');

    // コンテンツエリアが更新されるまで少し待機
    await page.waitForTimeout(1000);

    // チケットコンテナが表示されているか確認
    let contentLoaded = false;
    for (const selector of this.config.selectors.ticketContainer) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        contentLoaded = true;
        break;
      } catch (_error) {
        // 次のセレクターを試行
      }
    }

    if (!contentLoaded) {
      console.warn('Away tab content may not have loaded properly');
    }
  }

  private async extractTicketData(page: Page): Promise<ScrapedTicketData[]> {
    const tickets: ScrapedTicketData[] = [];

    // チケットコンテナを取得
    const ticketContainers = await this.findTicketContainers(page);

    for (const container of ticketContainers) {
      try {
        const ticketData = await this.extractSingleTicketData(page, container);
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
          (elements: Element[]) =>
            elements.map((_: Element, index: number) => `${selector}:nth-of-type(${index + 1})`),
        ) as string[];
        if (elements.length > 0) {
          return elements;
        }
      } catch (_error) {
        console.warn(`Ticket container selector failed: ${selector}`);
      }
    }
    return [];
  }

  private async extractSingleTicketData(
    page: Page,
    containerSelector: string,
  ): Promise<ScrapedTicketData | null> {
    try {
      const matchName = await this.extractText(
        page,
        containerSelector,
        this.config.selectors.matchTitle,
      );
      const matchDate = await this.extractText(
        page,
        containerSelector,
        this.config.selectors.matchDate,
      );
      const saleDate = await this.extractText(
        page,
        containerSelector,
        this.config.selectors.saleDate,
      );
      const venue = await this.extractText(page, containerSelector, this.config.selectors.venue);
      const ticketUrl = await this.extractHref(
        page,
        containerSelector,
        this.config.selectors.ticketLink,
      );
      const ticketTypes = await this.extractTicketTypes(page, containerSelector);

      if (!matchName || !matchDate || !saleDate || !venue || !ticketUrl) {
        return null;
      }

      return {
        matchName,
        matchDate,
        saleDate,
        venue,
        ticketUrl,
        ticketTypes,
      };
    } catch (error) {
      console.warn('Failed to extract single ticket data:', error);
      return null;
    }
  }

  private async extractText(
    page: Page,
    containerSelector: string,
    selectors: string[],
  ): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const fullSelector = `${containerSelector} ${selector}`;
        const text = await page.$eval(
          fullSelector,
          (element: Element) => element.textContent?.trim() || '',
        ) as string;
        if (text) {
          return text;
        }
      } catch (_error) {
        // 次のセレクターを試行
      }
    }
    return null;
  }

  private async extractHref(
    page: Page,
    containerSelector: string,
    selectors: string[],
  ): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const fullSelector = `${containerSelector} ${selector}`;
        const href = await page.$eval(fullSelector, (element: Element) => {
          const anchorElement = element as HTMLAnchorElement;
          if (anchorElement.href) {
            return anchorElement.href;
          }
          return null;
        }) as string | null;
        if (href) {
          return href;
        }
      } catch (_error) {
        // 次のセレクターを試行
      }
    }
    return null;
  }

  private async extractTicketTypes(page: Page, containerSelector: string): Promise<string[]> {
    const ticketTypes: string[] = [];

    for (const selector of this.config.selectors.ticketType) {
      try {
        const fullSelector = `${containerSelector} ${selector}`;
        const types = await page.$$eval(
          fullSelector,
          (elements: Element[]) =>
            elements.map((element: Element) => element.textContent?.trim() || '').filter((
              text: string,
            ) => text.length > 0),
        ) as string[];
        ticketTypes.push(...types);
      } catch (_error) {
        // 次のセレクターを試行
      }
    }

    return [...new Set(ticketTypes)]; // 重複を除去
  }

  private filterAwayTickets(tickets: ScrapedTicketData[]): ScrapedTicketData[] {
    return tickets.filter((ticket) => this.isAwayTicket(ticket));
  }

  private isAwayTicket(ticket: ScrapedTicketData): boolean {
    // 1. チケット種別名でのアウェイ判定（最優先）
    const ticketTypesText = ticket.ticketTypes.join(' ').toLowerCase();
    const hasAwayKeyword = this.config.awayKeywords.some((keyword) =>
      ticketTypesText.includes(keyword.toLowerCase())
    );

    if (hasAwayKeyword) {
      return true;
    }

    // 2. 試合名でのアウェイ判定（企画チケット等）
    const matchNameLower = ticket.matchName.toLowerCase();
    const matchHasAwayKeyword = this.config.awayKeywords.some((keyword) =>
      matchNameLower.includes(keyword.toLowerCase())
    );

    if (matchHasAwayKeyword) {
      return true;
    }

    // 3. 会場がアウェイスタジアムかどうかの判定
    const venue = ticket.venue.toLowerCase();
    const isAwayVenue = !venue.includes('埼玉スタジアム') &&
      !venue.includes('さいたま') &&
      venue.length > 0;

    // アウェイ会場の場合は、チケット種別に関係なくアウェイ試合として扱う
    // ただし、駐車券や企画チケットなど特殊なもの以外
    if (isAwayVenue && !this.isSpecialTicket(ticket)) {
      return true;
    }

    return false;
  }

  private isSpecialTicket(ticket: ScrapedTicketData): boolean {
    const matchNameLower = ticket.matchName.toLowerCase();
    const ticketTypesText = ticket.ticketTypes.join(' ').toLowerCase();

    const specialKeywords = [
      '駐車券',
      '駐車',
      '企画チケット',
      '車椅子',
      '障がい者',
      'parking',
    ];

    return specialKeywords.some((keyword) =>
      matchNameLower.includes(keyword.toLowerCase()) ||
      ticketTypesText.includes(keyword.toLowerCase())
    );
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.warn('Failed to close browser:', error);
      } finally {
        this.browser = null;
      }
    }
  }
}
