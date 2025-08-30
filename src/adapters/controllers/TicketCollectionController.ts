import { TicketCollectionUseCase } from '@/application/usecases/TicketCollectionUseCase.ts';
import { TicketCollectionPresenter } from '@/adapters/presenters/TicketCollectionPresenter.ts';
import { handleSupabaseError } from '@/infrastructure/utils/error-handler.ts';

export class TicketCollectionController {
  private ticketCollectionUseCase: TicketCollectionUseCase;

  constructor() {
    this.ticketCollectionUseCase = new TicketCollectionUseCase();
  }

  async handleCollectTickets(req: Request): Promise<Response> {
    try {
      const isAuthenticated = this.validateCloudSchedulerRequest(req);
      if (!isAuthenticated) {
        return TicketCollectionPresenter.toUnauthorizedResponse();
      }

      const result = await this.ticketCollectionUseCase.execute();
      return TicketCollectionPresenter.toSuccessResponse(result);
    } catch (error) {
      if (error instanceof Error) {
        handleSupabaseError('ticket collection', error);
      }

      return TicketCollectionPresenter.toErrorResponse(
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
}
