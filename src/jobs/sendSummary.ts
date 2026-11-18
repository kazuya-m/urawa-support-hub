/**
 * 月次のチケット一覧送信（/api/ticket-summary）
 * 販売中・販売予定のチケットを DB から取得し、試合日が過去のものを除いて LINE に broadcast する
 */

import type { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { LineClient } from '@/infrastructure/clients/LineClient.ts';
import { getAppConfig } from '@/config/app-config.ts';
import { getSupabaseAdminClient } from '@/config/supabase.ts';
import { LINE_MESSAGE_TEMPLATES } from '@/config/notification.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';
import { ErrorCodes } from '@/shared/errors/ErrorCodes.ts';

export interface SendSummaryDeps {
  ticketRepository: Pick<TicketRepository, 'findByStatusIn'>;
  lineClient: Pick<LineClient, 'broadcast'>;
}

/**
 * 本番の依存を作る（Supabase と LINE だけ）
 */
export function createSendSummaryDeps(): SendSummaryDeps {
  const config = getAppConfig();
  return {
    ticketRepository: new TicketRepository(getSupabaseAdminClient()),
    lineClient: new LineClient(config.line),
  };
}

/**
 * 失敗時は ERROR ログを出し、`Ticket summary notification failed: ...` の Error を投げる
 * LINE の送信失敗では、送信処理と全体の 2 か所でログを出してメッセージを 2 重に包む（移行前の挙動を維持）
 */
export async function sendSummary(deps: SendSummaryDeps, now: Date = new Date()): Promise<void> {
  const startTime = Date.now();

  try {
    // 1. 販売中・販売予定のチケットを取得する
    const targetTickets = await deps.ticketRepository.findByStatusIn(['on_sale', 'before_sale']);

    // 2. 試合日が過去のチケットを除く
    const upcomingTickets = targetTickets.filter((ticket) => ticket.matchDate >= now);

    // 3. 対象がなければ送らない
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

    // 4. 一覧を broadcast する
    await broadcastSummary(deps.lineClient, upcomingTickets);

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

async function broadcastSummary(
  lineClient: SendSummaryDeps['lineClient'],
  tickets: Ticket[],
): Promise<void> {
  const message = LINE_MESSAGE_TEMPLATES.ticketSummary(tickets);

  try {
    await lineClient.broadcast(message);

    CloudLogger.info('Ticket summary notification sent successfully', {
      category: LogCategory.NOTIFICATION,
      context: { stage: 'ticket_summary_sent' },
      metadata: {
        ticketCount: tickets.length,
      },
    });
  } catch (error) {
    CloudLogger.error('Ticket summary notification failed', {
      category: LogCategory.NOTIFICATION,
      context: { stage: 'ticket_summary_error' },
      error: toErrorInfo(error, ErrorCodes.TICKET_SUMMARY_ERROR, false),
    });
    throw new Error(`Ticket summary notification failed: ${getErrorMessage(error)}`);
  }
}
