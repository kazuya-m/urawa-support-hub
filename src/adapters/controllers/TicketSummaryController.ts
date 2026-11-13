import type { SendTicketSummaryUseCase } from '@/application/usecases/SendTicketSummaryUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';

export class TicketSummaryController {
  constructor(
    private readonly ticketSummaryUseCase: SendTicketSummaryUseCase,
  ) {}

  async handleTicketSummary(_req: Request): Promise<Response> {
    await this.ticketSummaryUseCase.execute();

    return HttpResponseBuilder.success({
      message: 'Ticket summary processed successfully',
      timestamp: new Date().toISOString(),
    });
  }
}
