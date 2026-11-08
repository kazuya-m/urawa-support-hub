import { ITicketCollectionUseCase } from '@/application/interfaces/usecases/ITicketCollectionUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import type { ErrorHandlingOptions } from '@/adapters/helpers/withErrorHandling.ts';
import { LogCategory } from '@/shared/logging/types.ts';

export const TICKET_COLLECTION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'UseCase error in ticket collection',
  category: LogCategory.TICKET_COLLECTION,
  unexpectedResponse: (errorMessage) => ['Ticket collection failed', errorMessage],
};

export class TicketCollectionController {
  constructor(
    private readonly ticketCollectionUseCase: ITicketCollectionUseCase,
  ) {}

  async handleCollectTickets(_req: Request): Promise<Response> {
    const result = await this.ticketCollectionUseCase.execute();

    return HttpResponseBuilder.success({
      message: 'Ticket collection completed successfully',
      ticketsFound: result.ticketsFound,
      newTickets: result.newTickets,
      updatedTickets: result.updatedTickets,
      executionTimeMs: result.executionDurationMs,
    });
  }
}
