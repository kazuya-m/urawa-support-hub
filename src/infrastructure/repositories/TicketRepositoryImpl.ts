import { SupabaseClient } from '@supabase/supabase-js';
import { Ticket } from '@/domain/entities/Ticket.ts';
import { TicketConverter } from './converters/TicketConverter.ts';
import { handleSupabaseError, isNotFoundError } from '../utils/error-handler.ts';
import { createSupabaseAdminClient } from '../config/supabase.ts';
import { TicketRow } from '../types/database.ts';
import { TicketUpsertResult } from '@/application/types/UseCaseResults.ts';

export class TicketRepositoryImpl {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createSupabaseAdminClient();
  }

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
    return TicketConverter.toDomainEntity(data);
  }

  async findByColumn(column: string, value: unknown): Promise<Ticket[]> {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .eq(column, value)
      .order('created_at', { ascending: true });

    if (error) handleSupabaseError(`fetch tickets by ${column}`, error);
    return data.map(TicketConverter.toDomainEntity);
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

  async save(ticket: Ticket): Promise<void> {
    const { error } = await this.client
      .from('tickets')
      .insert(TicketConverter.toDatabaseRow(ticket));

    if (error) handleSupabaseError('save ticket', error);
  }

  async update(ticket: Ticket): Promise<void> {
    const { error } = await this.client
      .from('tickets')
      .update({
        ...TicketConverter.toDatabaseRow(ticket),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (error) handleSupabaseError('update ticket', error);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('tickets')
      .delete()
      .eq('id', id);

    if (error) handleSupabaseError('delete ticket', error);
  }

  async deleteByDateRange(column: string, beforeDate: Date): Promise<void> {
    const { error } = await this.client
      .from('tickets')
      .delete()
      .lt(column, beforeDate.toISOString());

    if (error) handleSupabaseError('delete tickets by date', error);
  }

  async upsert(ticket: Ticket): Promise<TicketUpsertResult> {
    const existing = await this.findById(ticket.id);
    const isNew = !existing;
    const hasChanged = isNew ? false : ticket.hasSignificantChanges(existing);

    if (isNew || hasChanged) {
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

      const savedTicket = TicketConverter.toDomainEntity(upsertedData as TicketRow);
      return {
        isNew,
        hasChanged,
        ticket: savedTicket,
      };
    }

    return {
      isNew: false,
      hasChanged: false,
      ticket: existing,
    };
  }
}
