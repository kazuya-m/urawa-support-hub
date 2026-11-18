import type { TicketCollectionUseCase } from '@/application/usecases/TicketCollectionUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';

export class TicketCollectionController {
  constructor(
    private readonly ticketCollectionUseCase: TicketCollectionUseCase,
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
