import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import type { ErrorHandlingContext } from '@/adapters/helpers/withErrorHandling.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

/**
 * POST /api/collect-tickets
 */
export const TICKET_COLLECTION_ERROR_CONTEXT: ErrorHandlingContext = {
  operation: 'ticket collection',
  category: LogCategory.TICKET_COLLECTION,
  onUnexpected: (error) => {
    const errorMessage = getErrorMessage(error);
    CloudLogger.critical('Unexpected error in TicketCollectionController', {
      category: LogCategory.SYSTEM,
      error: toErrorInfo(error, undefined, false),
    });
    return HttpResponseBuilder.error('Ticket collection failed', errorMessage);
  },
};

/**
 * POST /api/send-notification
 */
export const NOTIFICATION_ERROR_CONTEXT: ErrorHandlingContext = {
  operation: 'notification processing',
  category: LogCategory.NOTIFICATION,
  onUnexpected: (error) => {
    const errorMessage = getErrorMessage(error);
    CloudLogger.critical('Unexpected error in NotificationController', {
      category: LogCategory.NOTIFICATION,
      error: toErrorInfo(error, undefined, false),
    });
    return HttpResponseBuilder.error('Internal Server Error', errorMessage);
  },
};

/**
 * POST /api/ticket-summary
 */
export const TICKET_SUMMARY_ERROR_CONTEXT: ErrorHandlingContext = {
  operation: 'ticket summary processing',
  category: LogCategory.NOTIFICATION,
  onUnexpected: (error) => {
    const errorMessage = getErrorMessage(error);
    CloudLogger.error('Unexpected error in ticket summary processing', {
      category: LogCategory.NOTIFICATION,
      context: { processingStage: 'TicketSummaryController' },
      error: toErrorInfo(error, undefined, false),
    });

    return HttpResponseBuilder.error(
      'Internal server error during ticket summary processing',
      {
        errorType: 'UnknownError',
        errorMessage,
      },
    );
  },
};
