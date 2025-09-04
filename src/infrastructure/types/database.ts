import { NotificationType } from '@/domain/entities/NotificationTypes.ts';

export interface TicketRow {
  id: string;
  match_name: string;
  match_date: string;
  home_team: string | null;
  away_team: string | null;
  sale_start_date: string | null;
  sale_start_time: string | null;
  sale_end_date: string | null;
  venue: string | null;
  ticket_types: string[] | null;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
  scraped_at: string;
  sale_status: 'before_sale' | 'on_sale' | 'ended';
  notification_scheduled: boolean;
}

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
  home_team?: string | null;
  away_team?: string | null;
  sale_start_date?: string | null;
  sale_start_time?: string | null;
  sale_end_date?: string | null;
  venue?: string | null;
  ticket_types?: string[] | null;
  ticket_url?: string | null;
  scraped_at: string;
  sale_status: 'before_sale' | 'on_sale' | 'ended';
  notification_scheduled?: boolean;
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
