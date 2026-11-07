import { ITicketSummaryUseCase } from '@/application/interfaces/usecases/ITicketSummaryUseCase.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { AppError, DatabaseError } from '@/shared/errors/index.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

export class TicketSummaryController {
  constructor(
    private readonly ticketSummaryUseCase: ITicketSummaryUseCase,
  ) {}

  async handleTicketSummary(_req: Request): Promise<Response> {
    try {
      await this.ticketSummaryUseCase.execute();

      return HttpResponseBuilder.success({
        message: 'Ticket summary processed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // DatabaseError は AppError のサブクラスなので先に判定する
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

      if (error instanceof AppError) {
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

      // 予期しないエラー
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
    }
  }
}
