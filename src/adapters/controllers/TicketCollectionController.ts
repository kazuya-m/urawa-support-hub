import { TicketCollectionUseCase } from '@/application/usecases/TicketCollectionUseCase.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

interface ErrorResponse {
  error: string;
  details?: unknown;
  timestamp: string;
  traceId?: string;
}

export class TicketCollectionController {
  private ticketCollectionUseCase: TicketCollectionUseCase;

  constructor() {
    this.ticketCollectionUseCase = new TicketCollectionUseCase();
  }

  async handleCollectTickets(req: Request): Promise<Response> {
    const startTime = Date.now();

    try {
      const isAuthenticated = this.validateCloudSchedulerRequest(req);
      if (!isAuthenticated) {
        return this.createErrorResponse(
          'Unauthorized',
          'Invalid or missing OIDC token',
          401,
        );
      }

      await this.ticketCollectionUseCase.execute();

      const executionTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          status: 'success',
          message: 'Ticket collection completed successfully',
          executionTimeMs: executionTime,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } catch (error) {
      if (error instanceof Error) {
        handleSupabaseError('ticket collection', error);
      }

      return this.createErrorResponse(
        'Ticket collection failed',
        error instanceof Error ? error.message : String(error),
        500,
      );
    }
  }

  public validateCloudSchedulerRequest(req: Request): boolean {
    const authHeader = req.headers.get('Authorization');

    if (Deno.env.get('NODE_ENV') !== 'production') {
      return true;
    }

    return !!authHeader;
  }

  private createErrorResponse(error: string, details: unknown, status: number): Response {
    const errorResponse: ErrorResponse = {
      error,
      details,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
