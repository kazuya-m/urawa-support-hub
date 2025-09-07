import { SupabaseClient } from '@supabase/supabase-js';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketConverter } from './converters/TicketConverter.ts';
import { handleSupabaseError, isNotFoundError } from '../utils/error-handler.ts';
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

    if (error) handleSupabaseError('fetch tickets', error);
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
      handleSupabaseError('fetch ticket', error);
    }

    if (!data) return null;
    return TicketConverter.toDomainEntity(data);
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

    if (error) handleSupabaseError('fetch tickets by date range', error);
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

    if (upsertError) handleSupabaseError('upsert ticket', upsertError);

    if (!upsertedData) {
      throw new Error('Upsert operation did not return data');
    }

    return TicketConverter.toDomainEntity(upsertedData as TicketRow);
  }
}
