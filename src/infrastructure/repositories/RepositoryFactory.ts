import { getSupabaseClient } from '@/infrastructure/config/supabase.ts';
import { TicketRepository } from '@/domain/interfaces/TicketRepository.ts';
import { NotificationRepository } from '@/domain/interfaces/NotificationRepository.ts';
import { TicketRepositoryImpl } from '@/infrastructure/repositories/TicketRepositoryImpl.ts';
import { NotificationRepositoryImpl } from '@/infrastructure/repositories/NotificationRepositoryImpl.ts';

/**
 * リポジトリファクトリー
 * 中央集権化されたSupabaseクライアントを使用してリポジトリインスタンスを作成
 */
export class RepositoryFactory {
  private static ticketRepository: TicketRepository | null = null;
  private static notificationRepository: NotificationRepository | null = null;

  /**
   * TicketRepositoryのインスタンスを取得（シングルトン）
   */
  static getTicketRepository(): TicketRepository {
    if (!this.ticketRepository) {
      const client = getSupabaseClient();
      this.ticketRepository = new TicketRepositoryImpl(client);
    }
    return this.ticketRepository;
  }

  /**
   * NotificationRepositoryのインスタンスを取得（シングルトン）
   */
  static getNotificationRepository(): NotificationRepository {
    if (!this.notificationRepository) {
      const client = getSupabaseClient();
      this.notificationRepository = new NotificationRepositoryImpl(client);
    }
    return this.notificationRepository;
  }

  /**
   * テスト用：全リポジトリインスタンスをリセット
   */
  static resetInstances(): void {
    this.ticketRepository = null;
    this.notificationRepository = null;
  }
}
