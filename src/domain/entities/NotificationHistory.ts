import { getDisplayName, isValidNotificationType, NotificationType } from './NotificationTypes.ts';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

interface NotificationHistoryProps {
  id: string;
  ticketId: string;
  notificationType: NotificationType;
  scheduledAt: Date;
  sentAt?: Date;
  status: NotificationStatus;
  errorMessage?: string;
  createdAt: Date;
}

export class NotificationHistory {
  private readonly props: NotificationHistoryProps;

  constructor(props: NotificationHistoryProps) {
    this.validateNotificationData(props);
    this.props = { ...props };
  }

  get id(): string {
    return this.props.id;
  }
  get ticketId(): string {
    return this.props.ticketId;
  }
  get notificationType(): NotificationType {
    return this.props.notificationType;
  }
  get scheduledAt(): Date {
    return this.props.scheduledAt;
  }
  get sentAt(): Date | undefined {
    return this.props.sentAt;
  }
  get status(): NotificationStatus {
    return this.props.status;
  }
  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  canBeSent(currentTime: Date = new Date()): boolean {
    if (this.props.status !== 'pending') return false;

    const timeDiff = this.props.scheduledAt.getTime() - currentTime.getTime();
    return timeDiff <= 5 * 60 * 1000;
  }

  isExpired(currentTime: Date = new Date()): boolean {
    const timeDiff = currentTime.getTime() - this.props.scheduledAt.getTime();
    return this.props.status === 'pending' && timeDiff > 60 * 60 * 1000;
  }

  canRetry(currentTime: Date = new Date()): boolean {
    if (this.props.status !== 'failed') return false;
    if (this.isExpired(currentTime)) return false;

    const sentAt = this.props.sentAt || this.props.createdAt;
    const timeSinceFailure = currentTime.getTime() - sentAt.getTime();
    return timeSinceFailure >= 5 * 60 * 1000;
  }

  markAsSent(sentTime: Date = new Date()): NotificationHistory {
    return new NotificationHistory({
      ...this.props,
      status: 'sent',
      sentAt: sentTime,
      errorMessage: undefined,
    });
  }

  markAsFailed(errorMessage: string, failedTime: Date = new Date()): NotificationHistory {
    return new NotificationHistory({
      ...this.props,
      status: 'failed',
      sentAt: failedTime,
      errorMessage,
    });
  }

  markForRetry(): NotificationHistory {
    return new NotificationHistory({
      ...this.props,
      status: 'pending',
      errorMessage: undefined,
    });
  }

  getNotificationTypeDisplayName(): string {
    return getDisplayName(this.props.notificationType);
  }

  private validateNotificationData(props: NotificationHistoryProps): void {
    if (!props.id || props.id.trim() === '') {
      throw new Error('Notification ID is required');
    }
    if (!props.ticketId || props.ticketId.trim() === '') {
      throw new Error('Ticket ID is required');
    }
    if (!isValidNotificationType(props.notificationType)) {
      throw new Error('Invalid notification type');
    }
    if (!['pending', 'sent', 'failed'].includes(props.status)) {
      throw new Error('Invalid notification status');
    }
    if (props.status === 'sent' && !props.sentAt) {
      throw new Error('Sent notifications must have sentAt timestamp');
    }
    if (props.status === 'failed' && !props.errorMessage) {
      throw new Error('Failed notifications must have error message');
    }
    if (props.scheduledAt <= props.createdAt) {
      throw new Error('Scheduled time must be after creation time');
    }
  }

  toPlainObject(): NotificationHistoryProps {
    return { ...this.props };
  }
}

export interface NotificationMessage {
  content: string;
  type: string;
}
