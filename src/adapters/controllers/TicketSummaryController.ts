import { ITicketSummaryUseCase } from '@/application/interfaces/usecases/ITicketSummaryUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { ApplicationError, DatabaseError } from '@/shared/errors/index.ts';

export class TicketSummaryController {
  constructor(
    private readonly ticketSummaryUseCase: ITicketSummaryUseCase,
  ) {}

  async handleTicketSummary(_req: Request): Promise<Response> {
    try {
      CloudLogger.info('Received ticket summary request from Cloud Scheduler', {
        category: LogCategory.NOTIFICATION,
        context: { processingStage: 'TicketSummaryController' },
      });

      await this.ticketSummaryUseCase.execute();

      CloudLogger.info('Ticket summary handler completed successfully', {
        category: LogCategory.NOTIFICATION,
        context: { processingStage: 'TicketSummaryController' },
      });

      return HttpResponseBuilder.success({
        message: 'Ticket summary processed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        CloudLogger.error('UseCase error in ticket summary processing', {
          category: LogCategory.NOTIFICATION,
          context: { processingStage: 'TicketSummaryController' },
          error: {
            code: error.code,
            message: error.message,
            details: JSON.stringify(error.context),
          },
        });

        return HttpResponseBuilder.error(
          'Ticket summary processing failed',
          {
            errorType: 'ApplicationError',
            errorMessage: error.message,
            details: JSON.stringify(error.context),
          },
        );
      }

      if (error instanceof DatabaseError) {
        CloudLogger.error('Database error in ticket summary processing', {
          category: LogCategory.DATABASE,
          context: { processingStage: 'TicketSummaryController' },
          error: {
            code: error.code,
            message: error.message,
            details: JSON.stringify(error.context),
          },
        });

        return HttpResponseBuilder.error(
          'Database error during ticket summary processing',
          {
            errorType: 'DatabaseError',
            errorMessage: error.message,
          },
        );
      }

      // 予期しないエラー
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      CloudLogger.error('Unexpected error in ticket summary processing', {
        category: LogCategory.NOTIFICATION,
        context: { processingStage: 'TicketSummaryController' },
        error: {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      });

      return HttpResponseBuilder.error(
        'Internal server error during ticket summary processing',
        {
          errorType: 'UnknownError',
          errorMessage,
        },
      );
    }
  }
}
