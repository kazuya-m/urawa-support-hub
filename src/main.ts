import { load } from '@std/dotenv';
import type { NotificationController } from '@/adapters/controllers/NotificationController.ts';
import type { TicketCollectionController } from '@/adapters/controllers/TicketCollectionController.ts';
import { createSendSummaryDeps, sendSummary, type SendSummaryDeps } from '@/jobs/sendSummary.ts';
import { handleHealthCheck } from '@/middleware/health.ts';
import { HttpResponseBuilder } from '@/adapters/helpers/HttpResponseBuilder.ts';
import { AppError } from '@/shared/errors/index.ts';
import { CloudLogger } from '@/shared/logging/CloudLogger.ts';
import { LogCategory, type LogContext } from '@/shared/logging/types.ts';
import { getErrorMessage, toErrorInfo } from '@/shared/utils/errorUtils.ts';

// ---------------------------------------------------------------------------
// 共通エラーハンドラ
// ---------------------------------------------------------------------------

/**
 * ルートごとのエラー応答とログの設定
 */
export interface ErrorHandlingOptions {
  /** ログのメッセージ */
  logMessage: string;
  /** ログのカテゴリ */
  category: LogCategory;
  /** 想定外のエラーのログの severity（AppError は常に error） */
  severity?: 'error' | 'critical';
  /** ログに付けるコンテキスト */
  context?: LogContext;
  /** 想定外のエラーのときの応答（エラーメッセージ → [error, details]） */
  unexpectedResponse: (errorMessage: string) => [string, unknown];
}

/**
 * ハンドラの例外をログに出し、500 の JSON 応答に変換する
 * - AppError: [code] message と context を返す
 * - それ以外: options.unexpectedResponse で応答を組み立てる
 */
export async function withErrorHandling(
  handle: () => Promise<Response>,
  options: ErrorHandlingOptions,
): Promise<Response> {
  try {
    return await handle();
  } catch (error) {
    if (error instanceof AppError) {
      CloudLogger.error(options.logMessage, {
        category: options.category,
        context: options.context,
        error: {
          details: error.message,
          recoverable: true,
        },
      });
      return HttpResponseBuilder.error(error.formatMessage(), error.context);
    }

    CloudLogger[options.severity ?? 'error'](options.logMessage, {
      category: options.category,
      context: options.context,
      error: toErrorInfo(error, undefined, false),
    });
    const [message, details] = options.unexpectedResponse(getErrorMessage(error));
    return HttpResponseBuilder.error(message, details);
  }
}

/**
 * ルートごとのエラー応答とログの設定（withErrorHandling に渡す）
 * 各ルートで本番に到達するエラーの経路の応答・ログを、集約前の Controller と同じに保つ
 * - collect-tickets: job の AppError
 * - send-notification: リクエスト検証中の想定外エラー（severity は critical）
 * - ticket-summary: job の想定外エラー
 * メッセージと stage の旧クラス名は、ログの絞り込み条件を変えないために残している
 */

export const TICKET_COLLECTION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'UseCase error in ticket collection',
  category: LogCategory.TICKET_COLLECTION,
  unexpectedResponse: (errorMessage) => ['Ticket collection failed', errorMessage],
};

export const NOTIFICATION_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in NotificationController',
  category: LogCategory.NOTIFICATION,
  severity: 'critical',
  unexpectedResponse: (errorMessage) => ['Internal Server Error', errorMessage],
};

export const TICKET_SUMMARY_ERROR_OPTIONS: ErrorHandlingOptions = {
  logMessage: 'Unexpected error in ticket summary processing',
  category: LogCategory.NOTIFICATION,
  context: { stage: 'TicketSummaryController' },
  unexpectedResponse: (errorMessage) => [
    'Internal server error during ticket summary processing',
    { errorType: 'UnknownError', errorMessage },
  ],
};

// ---------------------------------------------------------------------------
// ルーティング
// ---------------------------------------------------------------------------

/**
 * ルートごとの処理の生成（テストではスタブに差し替える）
 * 生成は withErrorHandling の外で行う（生成時の例外は Deno.serve の既定の 500 になる）
 */
export interface RouteFactories {
  collectTickets: () => Promise<Pick<TicketCollectionController, 'handleCollectTickets'>>;
  sendNotification: () => Promise<Pick<NotificationController, 'handleSendNotification'>>;
  ticketSummary: () => SendSummaryDeps;
}

/**
 * di.ts は Playwright を読み込み、読み込み時に sys の権限を要する（通知系の job は読み込まない）
 * テストが main.ts を import できるよう、動的 import で初回のリクエスト時に読み込む
 */
const defaultRouteFactories: RouteFactories = {
  collectTickets: async () => (await import('@/config/di.ts')).createTicketCollectionController(),
  sendNotification: async () => (await import('@/config/di.ts')).createNotificationController(),
  ticketSummary: createSendSummaryDeps,
};

export async function handleRequest(
  req: Request,
  factories: RouteFactories = defaultRouteFactories,
): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === '/api/collect-tickets' && req.method === 'POST') {
    const ticketController = await factories.collectTickets();
    return await withErrorHandling(
      () => ticketController.handleCollectTickets(req),
      TICKET_COLLECTION_ERROR_OPTIONS,
    );
  }

  if (url.pathname === '/api/send-notification' && req.method === 'POST') {
    const notificationController = await factories.sendNotification();
    return await withErrorHandling(
      () => notificationController.handleSendNotification(req),
      NOTIFICATION_ERROR_OPTIONS,
    );
  }

  if (url.pathname === '/api/ticket-summary' && req.method === 'POST') {
    const deps = factories.ticketSummary();
    return await withErrorHandling(async () => {
      await sendSummary(deps);
      return HttpResponseBuilder.success({
        message: 'Ticket summary processed successfully',
        timestamp: new Date().toISOString(),
      });
    }, TICKET_SUMMARY_ERROR_OPTIONS);
  }

  if (url.pathname === '/health' && req.method === 'GET') {
    return handleHealthCheck();
  }

  return new Response(
    JSON.stringify({
      error: 'Not Found',
      message: `${req.method} ${url.pathname} is not supported`,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function main(): void {
  const port = parseInt(Deno.env.get('PORT') || '8080');

  Deno.serve({
    port,
  }, (req) => handleRequest(req));
}

if (import.meta.main) {
  // ローカル実行用に .env を環境変数へ読み込む（本番には .env がないので失敗を無視する）
  // テストが main.ts を import しても読み込まないよう、エントリポイントとして実行したときだけ行う
  try {
    await load({ export: true });
  } catch {
    // Ignore .env loading errors in production
  }
  main();
}
