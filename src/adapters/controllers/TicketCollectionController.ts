import { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { ApplicationError, DatabaseError } from '@/shared/errors/index.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';

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

      const errorMessage = error instanceof Error ? error.message : String(error);
      CloudLogger.critical('Unexpected error in TicketCollectionController', {
        category: LogCategory.SYSTEM,
        error: {
          details: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          recoverable: false,
        },
      });
      return HttpResponseBuilder.error('Ticket collection failed', errorMessage);
    }
  }
}
