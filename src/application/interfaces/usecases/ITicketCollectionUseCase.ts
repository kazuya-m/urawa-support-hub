import { TicketCollectionResult } from '@/application/interfaces/results/UseCaseResults.ts';

export interface ITicketCollectionUseCase {
  execute(): Promise<TicketCollectionResult>;
}
