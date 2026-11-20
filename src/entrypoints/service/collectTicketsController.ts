import { collectTickets, type CollectTicketsDeps } from '@/usecases/collectTickets.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { type ErrorHandlingOptions, successResponse, withErrorHandling } from './http.ts';

export const TICKET_COLLECTION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'UseCase error in ticket collection',
  category: LogCategory.TICKET_COLLECTION,
  unexpectedResponse: (errorMessage) => ['Ticket collection failed', errorMessage],
};

export function handleCollectTickets(deps: CollectTicketsDeps): Promise<Response> {
  return withErrorHandling(async () => {
    const result = await collectTickets(deps);

    return successResponse({
      message: 'Ticket collection completed successfully',
      ticketsFound: result.ticketsFound,
      newTickets: result.newTickets,
      updatedTickets: result.updatedTickets,
      executionTimeMs: result.executionDurationMs,
    });
  }, TICKET_COLLECTION_ERROR_OPTIONS);
}
