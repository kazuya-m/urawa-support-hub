import { getDisplayName, NotificationType } from './NotificationTypes.ts';

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
  sentAt?: Date;
  status: NotificationStatus;
  errorMessage?: string;
  cloudTaskId?: string; // Cloud TasksのタスクIDを保存（キャンセル時に使用）
  createdAt: Date;
}

export class Notification {
  private readonly props: NotificationProps;

  constructor(props: NotificationProps) {
    // Validation
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
  get cloudTaskId(): string | undefined {
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
      errorMessage: undefined,
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
    cancelledTime: Date = new Date(),
  ): Notification {
    return new Notification({
      ...this.props,
      status: 'cancelled',
      sentAt: cancelledTime,
      errorMessage: reason,
    });
  }

  isExpired(currentTime: Date = new Date()): boolean {
    // Sent notifications are never expired
    if (this.props.status === 'sent') return false;

    // Notification is expired if it's 2 hours or more past the scheduled time
    const timeSinceScheduled = currentTime.getTime() - this.props.scheduledAt.getTime();
    return timeSinceScheduled >= 2 * 60 * 60 * 1000;
  }

  canRetry(currentTime: Date = new Date()): boolean {
    // Only failed notifications can be retried
    if (this.props.status !== 'failed') return false;

    // Cannot retry if notification is expired
    if (this.isExpired(currentTime)) return false;

    // Cannot retry if last failure was less than 5 minutes ago
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
