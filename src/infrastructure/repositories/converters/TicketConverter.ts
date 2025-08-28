import { Ticket } from '@/domain/entities/index.ts';
import { TicketInsert, TicketRow } from '@/infrastructure/types/database.ts';

export class TicketConverter {
  static toDomainEntity(data: TicketRow): Ticket {
    return new Ticket({
      id: data.id,
      matchName: data.match_name,
      matchDate: new Date(data.match_date),
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      saleStartDate: new Date(data.sale_start_date),
      saleStartTime: data.sale_start_time ?? undefined,
      venue: data.venue,
      ticketTypes: data.ticket_types,
      ticketUrl: data.ticket_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });
  }

  static toDatabaseRow(ticket: Ticket): TicketInsert {
    const plainObject = ticket.toPlainObject();
    return {
      id: plainObject.id,
      match_name: plainObject.matchName,
      match_date: plainObject.matchDate.toISOString(),
      home_team: plainObject.homeTeam,
      away_team: plainObject.awayTeam,
      sale_start_date: plainObject.saleStartDate.toISOString(),
      sale_start_time: plainObject.saleStartTime,
      venue: plainObject.venue,
      ticket_types: plainObject.ticketTypes,
      ticket_url: plainObject.ticketUrl,
    };
  }
}
