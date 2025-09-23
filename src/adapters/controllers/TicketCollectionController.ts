import { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { ApplicationError, DatabaseError } from '@/shared/errors/index.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

export class TicketCollectionController {
  constructor(
    private readonly ticketCollectionUseCase: ITicketCollectionUseCase,
  ) {}

  async handleCollectTickets(_req: Request): Promise<Response> {
    try {
      const result = await this.ticketCollectionUseCase.execute();

      return HttpResponseBuilder.success({
        message: 'Ticket collection completed successfully',
        ticketsFound: result.ticketsFound,
        newTickets: result.newTickets,
        updatedTickets: result.updatedTickets,
        executionTimeMs: result.executionDurationMs,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        CloudLogger.error('UseCase error in ticket collection', {
          category: LogCategory.TICKET_COLLECTION,
          error: {
            details: error.message,
            recoverable: true,
          },
        });
        return HttpResponseBuilder.error(
          error.formatMessage(),
          error.context,
        );
      }

      if (error instanceof DatabaseError) {
        CloudLogger.error('Database error in ticket collection', {
          category: LogCategory.DATABASE,
          error: {
            details: error.message,
            recoverable: false,
          },
        });
        return HttpResponseBuilder.error(
          'Database operation failed',
          { operation: 'ticket collection' },
        );
      }

      const errorMessage = getErrorMessage(error);
      CloudLogger.critical('Unexpected error in TicketCollectionController', {
        category: LogCategory.SYSTEM,
        error: toErrorInfo(error, undefined, false),
      });
      return HttpResponseBuilder.error('Ticket collection failed', errorMessage);
    }
  }
}
