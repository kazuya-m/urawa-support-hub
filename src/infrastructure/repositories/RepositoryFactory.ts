import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import { NotificationRepositoryImpl } from '@/infrastructure/repositories/NotificationRepositoryImpl.ts';
import { HealthRepositoryImpl } from '@/infrastructure/repositories/HealthRepositoryImpl.ts';

/**
 * リポジトリファクトリー
 * 中央集権化されたSupabaseクライアントを使用してリポジトリインスタンスを作成
 */
export class RepositoryFactory {
  private static ticketRepository: TicketRepositoryImpl | null = null;
  private static notificationRepository: NotificationRepositoryImpl | null = null;
  private static healthRepository: HealthRepositoryImpl | null = null;

  /**
   * TicketRepositoryのインスタンスを取得（シングルトン）
   */
  static getTicketRepository(): TicketRepositoryImpl {
    if (!this.ticketRepository) {
      this.ticketRepository = new TicketRepositoryImpl();
    }
    return this.ticketRepository;
  }

  /**
   * NotificationRepositoryのインスタンスを取得（シングルトン）
   */
  static getNotificationRepository(): NotificationRepositoryImpl {
    if (!this.notificationRepository) {
      this.notificationRepository = new NotificationRepositoryImpl();
    }
    return this.notificationRepository;
  }

  /**
   * HealthRepositoryのインスタンスを取得（シングルトン）
   */
  static getHealthRepository(): HealthRepositoryImpl {
    if (!this.healthRepository) {
      this.healthRepository = new HealthRepositoryImpl();
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
