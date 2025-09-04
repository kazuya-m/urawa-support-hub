import { TicketRepository } from '@/infrastructure/repositories/TicketRepository.ts';
import { NotificationRepository } from '@/infrastructure/repositories/NotificationRepository.ts';
import { HealthRepository } from '@/infrastructure/repositories/HealthRepository.ts';

/**
 * リポジトリファクトリー
 * 中央集権化されたSupabaseクライアントを使用してリポジトリインスタンスを作成
 */
export class RepositoryFactory {
  private static ticketRepository: TicketRepository | null = null;
  private static notificationRepository: NotificationRepository | null = null;
  private static healthRepository: HealthRepository | null = null;

  /**
   * TicketRepositoryのインスタンスを取得（シングルトン）
   */
  static getTicketRepository(): TicketRepository {
    if (!this.ticketRepository) {
      this.ticketRepository = new TicketRepository();
    }
    return this.ticketRepository;
  }

  /**
   * NotificationRepositoryのインスタンスを取得（シングルトン）
   */
  static getNotificationRepository(): NotificationRepository {
    if (!this.notificationRepository) {
      this.notificationRepository = new NotificationRepository();
    }
    return this.notificationRepository;
  }

  /**
   * HealthRepositoryのインスタンスを取得（シングルトン）
   */
  static getHealthRepository(): HealthRepository {
    if (!this.healthRepository) {
      this.healthRepository = new HealthRepository();
    }
    return this.healthRepository;
  }

  /**
   * テスト用：全リポジトリインスタンスをリセット
   */
  static resetInstances(): void {
    this.ticketRepository = null;
    this.notificationRepository = null;
    this.healthRepository = null;
  }
}
