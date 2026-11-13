import { TicketCollectionResult } from '@/application/usecases/results.ts';

export interface ITicketCollectionUseCase {
  execute(): Promise<TicketCollectionResult>;
}
