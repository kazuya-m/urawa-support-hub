import { Ticket } from '@/domain/entities/index.ts';
import { TicketInsert, TicketRow } from '@/infrastructure/types/database.ts';

export class TicketConverter {
  static toDomainEntity(data: TicketRow): Ticket {
    return Ticket.fromExisting({
      id: data.id,
      matchName: data.match_name,
      matchDate: new Date(data.match_date),
      homeTeam: data.home_team ?? undefined,
      awayTeam: data.away_team ?? undefined,
      saleStartDate: data.sale_start_date ? new Date(data.sale_start_date) : null,
      saleStartTime: data.sale_start_time ?? undefined,
      saleEndDate: data.sale_end_date ? new Date(data.sale_end_date) : undefined,
      venue: data.venue ?? undefined,
      ticketTypes: data.ticket_types ?? undefined,
      ticketUrl: data.ticket_url ?? undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      scrapedAt: new Date(data.scraped_at),
      saleStatus: data.sale_status,
      notificationScheduled: data.notification_scheduled ?? false,
    });
  }

  static toDatabaseRow(ticket: Ticket): TicketInsert {
    const plainObject = ticket.toPlainObject();
    return {
      id: plainObject.id,
      match_name: plainObject.matchName,
      match_date: plainObject.matchDate.toISOString(),
      home_team: plainObject.homeTeam ?? null,
      away_team: plainObject.awayTeam ?? null,
      sale_start_date: plainObject.saleStartDate?.toISOString() ?? null,
      sale_start_time: plainObject.saleStartTime ?? null,
      sale_end_date: plainObject.saleEndDate?.toISOString() ?? null,
      venue: plainObject.venue ?? null,
      ticket_types: plainObject.ticketTypes ?? [],
      ticket_url: plainObject.ticketUrl ?? null,
      scraped_at: plainObject.scrapedAt.toISOString(),
      sale_status: plainObject.saleStatus,
      notification_scheduled: plainObject.notificationScheduled ?? false,
    };
  }
}
