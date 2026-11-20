import { sendSummary, type SendSummaryDeps } from '@/usecases/sendSummary.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { type ErrorHandlingOptions, successResponse, withErrorHandling } from './http.ts';

const TICKET_SUMMARY_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in ticket summary processing',
  category: LogCategory.NOTIFICATION,
  context: { stage: 'TicketSummaryController' },
  unexpectedResponse: (errorMessage) => [
    'Internal server error during ticket summary processing',
    { errorType: 'UnknownError', errorMessage },
  ],
};

export function handleSendSummary(deps: SendSummaryDeps): Promise<Response> {
  return withErrorHandling(async () => {
    await sendSummary(deps);
    return successResponse({
      message: 'Ticket summary processed successfully',
      timestamp: new Date().toISOString(),
    });
  }, TICKET_SUMMARY_ERROR_OPTIONS);
}
