import { Ticket } from '@/domain/entities/Ticket.ts';
import { ValidatedTicketData } from './types/ValidationResult.ts';

export class TicketDataMapper {
  static async createTicketEntity(
    validatedData: ValidatedTicketData,
    matchDate: Date,
    saleStartDate: Date,
    homeTeam?: string,
    awayTeam?: string,
  ): Promise<Ticket> {
    const ticket = await Ticket.createNew({
      matchName: validatedData.matchName,
      matchDate,
      homeTeam,
      awayTeam,
      saleStartDate,
      venue: validatedData.venue || '',
      ticketTypes: validatedData.ticketTypes || [],
      ticketUrl: validatedData.ticketUrl || '',
    });

    return ticket;
  }
}
