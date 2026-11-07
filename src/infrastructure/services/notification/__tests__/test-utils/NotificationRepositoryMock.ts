import type { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import type { Notification } from '@/domain/entities/Notification.ts';

export interface MockNotificationRepositoryOptions {
  shouldError?: boolean;
  errorMessage?: string;
}

export function createMockNotificationRepository(
  options: MockNotificationRepositoryOptions = {},
): NotificationRepository {
  const {
    shouldError = false,
    errorMessage = 'Mock notification repository error',
  } = options;

  const notifications: Notification[] = [];

  const mockRepository = {
    findById(id: string): Promise<Notification | null> {
      if (shouldError) return Promise.reject(new Error(errorMessage));
      return Promise.resolve(notifications.find((n) => n.id === id) || null);
    },

    findByTicketId(ticketId: string): Promise<Notification[]> {
      if (shouldError) return Promise.reject(new Error(errorMessage));
      return Promise.resolve(notifications.filter((n) => n.ticketId === ticketId));
    },

    save(notification: Notification): Promise<void> {
      if (shouldError) return Promise.reject(new Error(errorMessage));
      notifications.push(notification);
      return Promise.resolve();
    },

    update(notification: Notification): Promise<void> {
      if (shouldError) return Promise.reject(new Error(errorMessage));
      const index = notifications.findIndex((n) => n.id === notification.id);
      if (index >= 0) {
        notifications[index] = notification;
      }
      return Promise.resolve();
    },

    // 内部プロパティ（実際のNotificationRepositoryには存在しないが、型の互換性のため）
    get client() {
      return null;
    },
  };

  return mockRepository as unknown as NotificationRepository;
}
