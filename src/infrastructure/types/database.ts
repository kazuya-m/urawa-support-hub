import { NotificationType } from '@/domain/entities/NotificationTypes.ts';
import type { SaleStatus } from '@/domain/types/SaleStatus.ts';

export interface TicketRow {
  id: string;
  match_name: string;
  match_date: string;
  home_team: string | null;
  away_team: string | null;
  competition: string | null;
  sale_start_date: string | null;
  sale_end_date: string | null;
  venue: string | null;
  ticket_types: string[] | null;
  ticket_url: string | null;
  created_at: string;
  updated_at: string;
  scraped_at: string;
  sale_status: SaleStatus;
  notification_scheduled: boolean;
}

export interface NotificationRow {
  id: string;
  ticket_id: string;
  notification_type: NotificationType;
  notification_time: string;
  sent_at: string | null;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  error_message: string | null;
  created_at: string;
  updated_at: string;
  cloud_task_id: string | null;
}

export interface TicketInsert {
  id: string;
  match_name: string;
  match_date: string;
  home_team?: string | null;
  away_team?: string | null;
  competition?: string | null;
  sale_start_date?: string | null;
  sale_end_date?: string | null;
  venue?: string | null;
  ticket_types?: string[] | null;
  ticket_url?: string | null;
  scraped_at: string;
  sale_status: SaleStatus;
  notification_scheduled?: boolean;
}

export interface NotificationInsert {
  id: string;
  ticket_id: string;
  notification_type: NotificationType;
  notification_time: string;
  sent_at?: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  error_message?: string;
  cloud_task_id?: string;
}
