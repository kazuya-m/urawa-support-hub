import { ITicketSummaryUseCase } from '@/application/interfaces/usecases/ITicketSummaryUseCase.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';
import { ILineClient } from '@/infrastructure/clients/LineClient.ts';
import { LINE_MESSAGE_TEMPLATES } from '@/config/notification.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';

export class SendTicketSummaryUseCase implements ITicketSummaryUseCase {
  constructor(
    private readonly ticketRepository: ITicketRepository,
    private readonly lineClient: ILineClient,
  ) {}

  async execute(): Promise<void> {
    CloudLogger.info('Starting ticket summary notification', {
      category: LogCategory.NOTIFICATION,
      context: { processingStage: 'SendTicketSummaryUseCase' },
    });

    // 効率的なクエリ実行：必要なチケットのみ取得
    const targetTickets = await this.ticketRepository
      .findByStatusIn(['on_sale', 'before_sale']);

    CloudLogger.info(`Found ${targetTickets.length} tickets to notify`, {
      category: LogCategory.NOTIFICATION,
      context: {
        processingStage: 'SendTicketSummaryUseCase',
        ticketsCount: targetTickets.length,
      },
    });

    // チケットが存在しない場合はLINE送信をスキップ
    if (targetTickets.length === 0) {
      CloudLogger.info('No tickets found, skipping LINE notification', {
        category: LogCategory.NOTIFICATION,
        context: { processingStage: 'SendTicketSummaryUseCase' },
      });
      return;
    }

    // LINEメッセージ作成・送信
    const message = LINE_MESSAGE_TEMPLATES.ticketSummary(targetTickets);
    await this.lineClient.broadcast(message);

    CloudLogger.info('Ticket summary sent successfully', {
      category: LogCategory.NOTIFICATION,
      context: { processingStage: 'SendTicketSummaryUseCase' },
    });
  }
}
