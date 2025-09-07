import { TicketCollectionResult } from '@/application/types/UseCaseResults.ts';

export interface ITicketCollectionUseCase {
  execute(): Promise<TicketCollectionResult>;
}
