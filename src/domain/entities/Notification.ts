import { getDisplayName, NotificationType } from '@/domain/config/NotificationConfig.ts';

export type NotificationStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';

export type CancellationReason =
  | 'Cancelled due to ticket update'
  | 'Cancelled due to sale date change'
  | 'Cancelled due to ticket deletion'
  | 'Cancelled due to manual intervention'
  | 'Cancelled due to system maintenance';

interface NotificationProps {
  id: string;
  ticketId: string;
  notificationType: NotificationType;
  scheduledAt: Date;
  sentAt: Date | null;
  status: NotificationStatus;
  errorMessage: string | null;
  cloudTaskId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export class Notification {
  private readonly props: NotificationProps;

  constructor(props: NotificationProps) {
    if (!props.id.trim()) {
      throw new Error('Notification ID is required');
    }

    if (!['day_before', 'hour_before', 'minutes_before'].includes(props.notificationType)) {
      throw new Error(`Invalid notification type: ${props.notificationType}`);
    }

    if (props.status === 'sent' && !props.sentAt) {
      throw new Error('Sent notifications must have sentAt timestamp');
    }

    if (props.status === 'failed' && !props.errorMessage) {
      throw new Error('Failed notifications must have error message');
    }

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
  get sentAt(): Date | null {
    return this.props.sentAt;
  }
  get status(): NotificationStatus {
    return this.props.status;
  }
  get errorMessage(): string | null {
    return this.props.errorMessage;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date | null {
    return this.props.updatedAt;
  }
  get cloudTaskId(): string | null {
    return this.props.cloudTaskId;
  }

  canBeSent(currentTime: Date = new Date()): boolean {
    if (this.props.status !== 'scheduled') return false;

    const timeDiff = this.props.scheduledAt.getTime() - currentTime.getTime();
    return timeDiff <= 5 * 60 * 1000;
  }

  markAsSent(sentTime: Date = new Date()): Notification {
    return new Notification({
      ...this.props,
      status: 'sent',
      sentAt: sentTime,
      errorMessage: null,
    });
  }

  markAsFailed(errorMessage: string, failedTime: Date = new Date()): Notification {
    return new Notification({
      ...this.props,
      status: 'failed',
      sentAt: failedTime,
      errorMessage,
    });
  }

  markAsCancelled(
    reason: CancellationReason,
    _cancelledTime: Date = new Date(),
  ): Notification {
    return new Notification({
      ...this.props,
      status: 'cancelled',
      errorMessage: reason,
    });
  }

  isExpired(currentTime: Date = new Date()): boolean {
    if (this.props.status === 'sent') return false;

    const timeSinceScheduled = currentTime.getTime() - this.props.scheduledAt.getTime();
    return timeSinceScheduled >= 2 * 60 * 60 * 1000;
  }

  canRetry(currentTime: Date = new Date()): boolean {
    if (this.props.status !== 'failed') return false;

    if (this.isExpired(currentTime)) return false;

    if (this.props.sentAt) {
      const timeSinceFailure = currentTime.getTime() - this.props.sentAt.getTime();
      return timeSinceFailure >= 5 * 60 * 1000;
    }

    return true;
  }

  getNotificationTypeDisplayName(): string {
    return getDisplayName(this.props.notificationType);
  }

  toPlainObject(): NotificationProps {
    return { ...this.props };
  }
}

export interface NotificationMessage {
  content: string;
  type: string;
}
