import { Ticket } from '@/domain/entities/Ticket.ts';
import { ITicketCollectionService } from '@/application/interfaces/services/ITicketCollectionService.ts';
import type { ISiteScrapingService } from '@/infrastructure/scraping/shared/interfaces/index.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ErrorCodes } from '@/shared/logging/ErrorCodes.ts';

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
            CloudLogger.error('Scraping service failed', {
              category: LogCategory.TICKET_COLLECTION,
              context: {
                stage: 'individual_service_scraping',
              },
              metadata: {
                serviceName: service.serviceName,
              },
              error: toErrorInfo(error, ErrorCodes.SCRAPING_SERVICE_ERROR, true),
            });
            return []; // 1サイト失敗しても他サイトの結果は返す
          }
        }),
      );

      // 結果を統合
      const allTickets = results.flat();

      return allTickets;
    } catch (error) {
      throw new Error(`Ticket collection failed: ${getErrorMessage(error)}`);
    }
  }
}
