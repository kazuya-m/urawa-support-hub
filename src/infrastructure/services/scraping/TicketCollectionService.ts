import { Ticket } from '@/domain/entities/Ticket.ts';
import { ITicketCollectionService } from '@/application/interfaces/services/ITicketCollectionService.ts';
import type { ISiteScrapingService } from '@/infrastructure/scraping/shared/interfaces/index.ts';

/**
 * チケット収集サービス（DI対応リファクタリング版）
 * 複数のサイト固有スクレイピングサービスを統合
 */
export class TicketCollectionService implements ITicketCollectionService {
  constructor(
    private readonly scrapingServices: ISiteScrapingService[],
  ) {}

  async collectAllTickets(): Promise<Ticket[]> {
    try {
      // 全サイトから並行してチケット収集
      const results = await Promise.all(
        this.scrapingServices.map(async (service) => {
          try {
            return await service.collectTickets();
          } catch (error) {
            console.error(`❌ ${service.serviceName} scraping failed:`, error);
            return []; // 1サイト失敗しても他サイトの結果は返す
          }
        }),
      );

      // 結果を統合
      const allTickets = results.flat();

      return allTickets;
    } catch (error) {
      throw new Error(`Ticket collection failed: ${error}`);
    }
  }
}
