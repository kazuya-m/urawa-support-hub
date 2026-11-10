import { ITicketSummaryUseCase } from '@/application/interfaces/usecases/ITicketSummaryUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';

export class TicketSummaryController {
  constructor(
    private readonly ticketSummaryUseCase: ITicketSummaryUseCase,
  ) {}

  async handleTicketSummary(_req: Request): Promise<Response> {
    await this.ticketSummaryUseCase.execute();

    return HttpResponseBuilder.success({
      message: 'Ticket summary processed successfully',
      timestamp: new Date().toISOString(),
    });
  }
}
