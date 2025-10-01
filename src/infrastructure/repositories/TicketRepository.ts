import { SupabaseClient } from '@supabase/supabase-js';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketConverter } from './converters/TicketConverter.ts';
import { isNotFoundError, throwDatabaseError } from '../utils/database-error-handler.ts';
import { TicketRow } from '../types/database.ts';
import { ITicketRepository } from '@/application/interfaces/repositories/ITicketRepository.ts';

export class TicketRepository implements ITicketRepository {
  constructor(
    private readonly client: SupabaseClient,
  ) {}

  async findAll(): Promise<Ticket[]> {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .order('match_date', { ascending: true });

    if (error) {
      throwDatabaseError('TicketRepository', 'findAll', error, {
        table: 'tickets',
      });
    }
    return data.map(TicketConverter.toDomainEntity);
  }

  async findById(id: string): Promise<Ticket | null> {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      throwDatabaseError('TicketRepository', 'findById', error, {
        table: 'tickets',
        ticketId: id,
      });
    }

    if (!data) return null;
    return TicketConverter.toDomainEntity(data);
  }

  async findByIds(ids: string[]): Promise<Map<string, Ticket>> {
    if (ids.length === 0) {
      return new Map();
    }

    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .in('id', ids);

    if (error) {
      throwDatabaseError('TicketRepository', 'findByIds', error, {
        table: 'tickets',
        ticketIds: ids,
      });
    }

    const resultMap = new Map<string, Ticket>();
    if (data) {
      for (const row of data) {
        const ticket = TicketConverter.toDomainEntity(row);
        resultMap.set(ticket.id, ticket);
      }
    }

    return resultMap;
  }

  async findByDateRange(column: string, startDate?: Date, endDate?: Date): Promise<Ticket[]> {
    let query = this.client
      .from('tickets')
      .select('*');

    if (startDate) {
      query = query.gte(column, startDate.toISOString());
    }

    if (endDate) {
      query = query.lte(column, endDate.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throwDatabaseError('TicketRepository', 'findByDateRange', error, {
        table: 'tickets',
        column,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });
    }
    return data.map(TicketConverter.toDomainEntity);
  }

  async findByStatusIn(statuses: string[]): Promise<Ticket[]> {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .in('sale_status', statuses)
      .order('match_date', { ascending: true });

    if (error) {
      throwDatabaseError('TicketRepository', 'findByStatusIn', error, {
        table: 'tickets',
        statuses,
      });
    }
    return data.map(TicketConverter.toDomainEntity);
  }

  async upsert(ticket: Ticket): Promise<Ticket> {
    const row = TicketConverter.toDatabaseRow(ticket);

    const { data: upsertedData, error: upsertError } = await this.client
      .from('tickets')
      .upsert({
        ...row,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (upsertError) {
      throwDatabaseError('TicketRepository', 'upsert', upsertError, {
        table: 'tickets',
        ticketId: ticket.id,
      });
    }

    if (!upsertedData) {
      throwDatabaseError('TicketRepository', 'upsert', {
        message: 'Upsert operation did not return data',
        code: 'NO_DATA',
      }, { table: 'tickets', ticketId: ticket.id });
    }

    return TicketConverter.toDomainEntity(upsertedData as TicketRow);
  }
}
