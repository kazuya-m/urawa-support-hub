#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-write --allow-sys --allow-run

/**
 * ブラウザの動作を一つずつ確認するテストスクリプト
 */

import { chromium } from 'npm:playwright@1.40.0';

console.log('🧪 ブラウザ動作テスト開始\n');

try {
  // ステップ1: ブラウザの起動
  console.log('1️⃣ ブラウザを起動...');
  const browser = await chromium.launch({
    channel: 'chrome', // システムのChromeを使用
    headless: true, // ヘッドレスモードでテスト
    timeout: 30000,
  });
  console.log('✅ ブラウザ起動成功\n');

  // ステップ2: ページの作成
  console.log('2️⃣ 新しいページを作成...');
  const page = await browser.newPage();
  console.log('✅ ページ作成成功\n');

  // ステップ3: Googleにアクセス（テスト）
  console.log('3️⃣ Googleにアクセス（ネットワーク確認）...');
  await page.goto('https://www.google.com', {
    waitUntil: 'domcontentloaded',
    timeout: 10000,
  });
  console.log('✅ Google アクセス成功\n');

  // スクリーンショット保存
  await page.screenshot({ path: './test-google.png' });
  console.log('📸 スクリーンショット保存: ./test-google.png\n');

  // ステップ4: J-Leagueチケットサイトにアクセス
  console.log('4️⃣ J-Leagueチケットサイトにアクセス...');
  console.log('URL: https://www.jleague-ticket.jp/club/ur/');
  await page.goto('https://www.jleague-ticket.jp/club/ur/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  console.log('✅ サイトアクセス成功\n');

  // ページのタイトルを確認
  const title = await page.title();
  console.log(`📄 ページタイトル: ${title}\n`);

  // スクリーンショット保存
  await page.screenshot({ path: './test-jleague.png', fullPage: true });
  console.log('📸 スクリーンショット保存: ./test-jleague.png\n');

  // ステップ5: アウェイタブを探す
  console.log('5️⃣ アウェイタブを探す...');
  const selectors = [
    'ul.js-ticket-tab li:nth-child(2) span',
    'ul.ticket-tab li:nth-child(2) span',
  ];

  let found = false;
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ タブ要素を発見: ${selector}`);
        found = true;

        // タブのテキストを取得
        const text = await element.textContent();
        console.log(`📝 タブのテキスト: ${text}\n`);
        break;
      }
    } catch (error) {
      console.log(`⚠️ セレクター ${selector} が見つかりません`);
    }
  }

  if (!found) {
    console.log('❌ アウェイタブが見つかりませんでした\n');

    // ページのHTML構造を確認
    console.log('📋 ページ構造を確認中...');
    const ticketTabs = await page.$$('ul.ticket-tab li');
    console.log(`タブの数: ${ticketTabs.length}`);

    for (let i = 0; i < ticketTabs.length; i++) {
      const tabText = await ticketTabs[i].textContent();
      console.log(`  タブ${i + 1}: ${tabText}`);
    }
  }

  // クリーンアップ
  console.log('\n🧹 ブラウザを閉じる...');
  await browser.close();
  console.log('✅ 完了');
} catch (error) {
  console.error('\n❌ エラーが発生しました:', error);
  console.error('詳細:', error.message);
  console.error('スタック:', error.stack);
  Deno.exit(1);
}
