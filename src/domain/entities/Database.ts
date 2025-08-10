export interface TicketRow {
  id: string;
  match_name: string;
  match_date: string;
  home_team: string;
  away_team: string;
  sale_start_date: string;
  sale_start_time: string | null;
  venue: string;
  ticket_types: string[];
  ticket_url: string;
  created_at: string;
  updated_at: string;
}

import { NotificationType } from '@/domain/entities/NotificationConfig.ts';

export interface NotificationRow {
  id: string;
  ticket_id: string;
  notification_type: NotificationType;
  scheduled_at: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  created_at: string;
}

export interface TicketInsert {
  id: string;
  match_name: string;
  match_date: string;
  home_team: string;
  away_team: string;
  sale_start_date: string;
  sale_start_time?: string;
  venue: string;
  ticket_types: string[];
  ticket_url: string;
}

export interface NotificationInsert {
  id: string;
  ticket_id: string;
  notification_type: NotificationType;
  scheduled_at: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
}