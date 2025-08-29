#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-write --allow-run --allow-sys

/**
 * Playwrightのブラウザをインストールするスクリプト
 */

import { installBrowsersWithProgressBar } from 'npm:playwright@1.40.0/lib/server';

console.log('🚀 Playwrightブラウザのインストールを開始します...');
console.log('インストール先: ~/Library/Caches/ms-playwright/');

try {
  await installBrowsersWithProgressBar(['chromium']);
  console.log('✅ Chromiumのインストールが完了しました！');
} catch (error) {
  console.error('❌ インストールに失敗しました:', error);
  Deno.exit(1);
}
