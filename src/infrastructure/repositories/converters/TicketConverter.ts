import { Ticket } from '@/domain/entities/index.ts';
import { TicketInsert, TicketRow } from '@/infrastructure/types/database.ts';

export class TicketConverter {
  static toDomainEntity(data: TicketRow): Ticket {
    return Ticket.fromExisting({
      id: data.id,
      matchName: data.match_name,
      matchDate: new Date(data.match_date),
      homeTeam: data.home_team ?? null,
      awayTeam: data.away_team ?? null,
      competition: data.competition ?? null,
      saleStartDate: data.sale_start_date ? new Date(data.sale_start_date) : null,
      saleEndDate: data.sale_end_date ? new Date(data.sale_end_date) : null,
      venue: data.venue ?? null,
      ticketTypes: data.ticket_types ?? null,
      ticketUrl: data.ticket_url ?? null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      scrapedAt: new Date(data.scraped_at),
      saleStatus: data.sale_status,
      notificationScheduled: data.notification_scheduled,
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
      competition: plainObject.competition,
      sale_start_date: plainObject.saleStartDate?.toISOString() ?? null,
      sale_end_date: plainObject.saleEndDate?.toISOString() ?? null,
      venue: plainObject.venue,
      ticket_types: plainObject.ticketTypes,
      ticket_url: plainObject.ticketUrl,
      scraped_at: plainObject.scrapedAt.toISOString(),
      sale_status: plainObject.saleStatus,
      notification_scheduled: plainObject.notificationScheduled,
    };
  }
}
