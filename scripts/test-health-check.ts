#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * ヘルスチェック機能のローカル動作確認スクリプト
 * Supabase無料枠自動停止対策の実装をテスト
 */

import { createClient } from '@supabase/supabase-js';
import { HealthRepositoryImpl } from '@/infrastructure/repositories/HealthRepositoryImpl.ts';
import { DailyExecutionService } from '@/infrastructure/services/DailyExecutionService.ts';
import { HealthCheckResult } from '@/domain/entities/SystemHealth.ts';

// テスト用のモックスクレイピングサービス
class MockScrapingService {
  private scenario: 'success' | 'empty' | 'error';

  constructor(scenario: 'success' | 'empty' | 'error' = 'success') {
    this.scenario = scenario;
  }

  async scrapeAwayTickets() {
    console.log(`📡 スクレイピング実行中... (シナリオ: ${this.scenario})`);

    // 実際の処理時間をシミュレート
    await new Promise((resolve) => setTimeout(resolve, 500));

    switch (this.scenario) {
      case 'success':
        return [
          { matchName: 'テストマッチ1', venue: 'アウェイスタジアム1' },
          { matchName: 'テストマッチ2', venue: 'アウェイスタジアム2' },
        ];
      case 'empty':
        return [];
      case 'error':
        throw new Error('スクレイピングエラー（テスト用）');
    }
  }
}

async function testHealthCheck() {
  console.log('🚀 ヘルスチェック機能テスト開始\n');

  // Supabaseローカル環境に接続
  const supabase = createClient(
    'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  );

  const healthRepository = new HealthRepositoryImpl(supabase);

  // テスト1: 成功シナリオ
  console.log('✅ テスト1: 正常動作（チケット発見）');
  const mockScrapingSuccess = new MockScrapingService('success');
  const dailyService1 = new DailyExecutionService(mockScrapingSuccess as any, healthRepository);

  try {
    await dailyService1.executeDaily();
    console.log('✅ 成功時のヘルスチェック記録完了\n');
  } catch (error) {
    console.error('❌ テスト1失敗:', error, '\n');
  }

  // テスト2: 空結果シナリオ（オフシーズン想定）
  console.log('📭 テスト2: オフシーズン想定（チケットなし）');
  const mockScrapingEmpty = new MockScrapingService('empty');
  const dailyService2 = new DailyExecutionService(mockScrapingEmpty as any, healthRepository);

  try {
    await dailyService2.executeDaily();
    console.log('✅ オフシーズン時のヘルスチェック記録完了\n');
  } catch (error) {
    console.error('❌ テスト2失敗:', error, '\n');
  }

  // テスト3: エラーシナリオ
  console.log('⚠️ テスト3: スクレイピングエラー');
  const mockScrapingError = new MockScrapingService('error');
  const dailyService3 = new DailyExecutionService(mockScrapingError as any, healthRepository);

  try {
    await dailyService3.executeDaily();
    console.log('❌ エラーが発生すべきでした');
  } catch (error) {
    console.log('✅ エラー時のヘルスチェック記録完了（想定通りのエラー）\n');
  }

  // テスト4: データベース確認
  console.log('🔍 データベース確認');
  try {
    const latest = await healthRepository.getLatestHealthRecord();
    console.log('最新のヘルスチェック記録:', {
      執行時刻: latest?.executedAt.toLocaleString('ja-JP'),
      チケット数: latest?.ticketsFound,
      ステータス: latest?.status,
      実行時間: `${latest?.executionDurationMs}ms`,
    });

    const history = await healthRepository.getHealthHistory(1);
    console.log(`過去24時間の記録数: ${history.length}`);

    const isHealthy = await healthRepository.isSystemHealthy();
    console.log(`システム健全性: ${isHealthy ? '✅ 健全' : '❌ 不健全'}\n`);
  } catch (error) {
    console.error('❌ データベース確認失敗:', error, '\n');
  }

  // テスト5: 直接的なヘルスチェック記録
  console.log('📝 テスト5: 直接的なヘルスチェック記録');
  try {
    const directHealthCheck: HealthCheckResult = {
      executedAt: new Date(),
      ticketsFound: 99,
      status: 'success',
      executionDurationMs: 1234,
    };

    await healthRepository.recordDailyExecution(directHealthCheck);
    console.log('✅ 直接記録完了\n');
  } catch (error) {
    console.error('❌ テスト5失敗:', error, '\n');
  }

  // 最終確認
  console.log('📊 最終状況確認');
  try {
    const { data, error } = await supabase
      .from('system_health')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    console.log('データベース内の最新5件:');
    data.forEach((record, index) => {
      console.log(
        `  ${
          index + 1
        }. ${record.executed_at} - ${record.status} (チケット数: ${record.tickets_found})`,
      );
    });

    console.log(`\n🎉 テスト完了: 合計 ${data.length} 件のヘルスチェック記録が作成されました`);
    console.log('💡 これによりSupabase無料枠の7日間自動停止を防ぐことができます！');
  } catch (error) {
    console.error('❌ 最終確認失敗:', error);
  }
}

if (import.meta.main) {
  await testHealthCheck();
}
