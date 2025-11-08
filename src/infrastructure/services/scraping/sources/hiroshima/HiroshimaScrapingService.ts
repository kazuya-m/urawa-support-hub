import { Ticket } from '@/domain/entities/Ticket.ts';
import { ISiteScrapingService } from '@/infrastructure/services/scraping/shared/interfaces/index.ts';
import { IPage } from '@/application/interfaces/clients/IPlaywrightClient.ts';
import { HIROSHIMA_SCRAPING_CONFIG } from '@/infrastructure/services/scraping/sources/hiroshima/HiroshimaConfig.ts';
import { HiroshimaDataExtractor } from './extractor/HiroshimaDataExtractor.ts';
import { HiroshimaDataParser } from './parser/HiroshimaDataParser.ts';
import { IBrowserManager } from '@/application/interfaces/clients/IBrowserManager.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';

/**
 * サンフレッチェ広島公式サイトスクレイピングサービス
 * 浦和レッズのアウェイチケット情報を取得
 */
export class HiroshimaScrapingService implements ISiteScrapingService {
  readonly serviceName = 'Hiroshima';

  private readonly dataExtractor: HiroshimaDataExtractor;
  private readonly dataParser: HiroshimaDataParser;
  private readonly browserManager: IBrowserManager;

  constructor(browserManager: IBrowserManager) {
    this.dataExtractor = new HiroshimaDataExtractor(
      HIROSHIMA_SCRAPING_CONFIG.schedulePageConfig,
      HIROSHIMA_SCRAPING_CONFIG.urawaKeywords,
    );
    this.dataParser = new HiroshimaDataParser();
    this.browserManager = browserManager;
  }

  async collectTickets(): Promise<Ticket[]> {
    CloudLogger.info('Starting ticket collection', {
      category: LogCategory.TICKET_COLLECTION,
      context: {
        stage: 'service_start',
      },
      metadata: {
        source: 'hiroshima',
      },
    });

    await this.browserManager.launch(HIROSHIMA_SCRAPING_CONFIG.timeouts.pageLoad);
    try {
      const page = await this.browserManager.createPage(
        HIROSHIMA_SCRAPING_CONFIG.timeouts.elementWait,
      );
      await this.configurePage(page);

      // サンフレッチェ広島公式サイトのスケジュールページにアクセス
      await this.browserManager.navigateToPage(page, HIROSHIMA_SCRAPING_CONFIG.baseUrl);

      // ページコンテンツの読み込みを待つ
      await this.waitForContent(page);

      // 浦和レッズ戦の情報を抽出（すべてアウェイチケット）
      const rawTickets = await this.dataExtractor.extractTickets(page);

      // 共通のTicket形式に変換
      const tickets = await this.dataParser.parseMultipleToTickets(rawTickets);

      // 警告をクリア
      this.dataExtractor.getAndClearWarnings();

      CloudLogger.info('Ticket collection completed', {
        category: LogCategory.TICKET_COLLECTION,
        context: {
          stage: 'service_complete',
        },
        metadata: {
          source: 'hiroshima',
          totalCollected: tickets.length,
        },
      });

      return tickets;
    } finally {
      await this.browserManager.close();
    }
  }

  private async configurePage(page: IPage): Promise<void> {
    // 日本語環境でアクセス
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
    });

    // ビューポートサイズを設定
    await page.setViewportSize({ width: 1280, height: 720 });
  }

  private async waitForContent(page: IPage): Promise<void> {
    // テーブルコンテンツの読み込みを待つ
    try {
      await this.browserManager.waitForContent(
        page,
        HIROSHIMA_SCRAPING_CONFIG.schedulePageConfig.selectors.ticketContainer,
        3000,
      );
    } catch {
      // タイムアウトしても続行（コンテンツが存在しない可能性）
    }
  }
}
