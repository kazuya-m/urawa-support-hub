import { ITicketSummaryUseCase } from '@/application/interfaces/usecases/ITicketSummaryUseCase.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';
import { INotificationService } from '@/application/interfaces/services/INotificationService.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { ErrorCodes } from '@/shared/logging/ErrorCodes.ts';

export class SendTicketSummaryUseCase implements ITicketSummaryUseCase {
  constructor(
    private readonly ticketRepository: ITicketRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async execute(): Promise<void> {
    const startTime = Date.now();

    try {
      // 効率的なクエリ実行：必要なチケットのみ取得
      const targetTickets = await this.ticketRepository
        .findByStatusIn(['on_sale', 'before_sale']);

      // 試合日が過去のチケットを除外
      const now = new Date();
      const upcomingTickets = targetTickets.filter((ticket) => ticket.matchDate >= now);

      // チケットが存在しない場合はLINE送信をスキップ
      if (upcomingTickets.length === 0) {
        CloudLogger.info('No upcoming tickets found, skipping LINE notification', {
          category: LogCategory.NOTIFICATION,
          context: { stage: 'no_tickets_skip' },
          metrics: {
            totalProcessed: targetTickets.length,
            successCount: 0,
            failureCount: 0,
            processingTimeMs: Date.now() - startTime,
          },
        });
        return;
      }

      // チケット一覧通知送信
      await this.notificationService.sendTicketSummary(upcomingTickets);

      CloudLogger.info('Ticket summary sent successfully', {
        category: LogCategory.NOTIFICATION,
        context: { stage: 'usecase_completion' },
        metrics: {
          totalProcessed: upcomingTickets.length,
          successCount: 1, // 通知送信成功
          failureCount: 0,
          processingTimeMs: Date.now() - startTime,
        },
      });
    } catch (error) {
      CloudLogger.error('Ticket summary notification failed', {
        category: LogCategory.NOTIFICATION,
        context: {
          stage: 'usecase_error',
        },
        error: toErrorInfo(error, ErrorCodes.TICKET_SUMMARY_ERROR, false),
      });
      throw new Error(`Ticket summary notification failed: ${getErrorMessage(error)}`);
    }
  }
}
