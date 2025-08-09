export interface NotificationHistory {
  id: string;
  ticketId: string;
  notificationType: 'day_before' | 'hour_before' | 'minutes_before';
  scheduledAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  createdAt: Date;
}

export interface NotificationMessage {
  content: string;
  type: string;
}