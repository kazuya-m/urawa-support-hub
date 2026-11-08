import { ITicketSummaryUseCase } from '@/application/interfaces/usecases/ITicketSummaryUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import type { ErrorHandlingOptions } from '@/adapters/helpers/withErrorHandling.ts';
import { LogCategory } from '@/shared/logging/types.ts';

export const TICKET_SUMMARY_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in ticket summary processing',
  category: LogCategory.NOTIFICATION,
  context: { processingStage: 'TicketSummaryController' },
  unexpectedResponse: (errorMessage) => [
    'Internal server error during ticket summary processing',
    { errorType: 'UnknownError', errorMessage },
  ],
};

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
