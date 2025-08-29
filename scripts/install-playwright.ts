#!/usr/bin/env -S deno run --allow-all

/**
 * Deno用Playwrightブラウザインストールスクリプト
 * Playwrightが必要とするChromiumブラウザをダウンロードします
 */

import { installDefaultBrowsersForNpmInstall } from 'npm:playwright-core@1.40.0/lib/server/registry/index.js';

console.log('🚀 Chromiumブラウザをインストールします...');
console.log('📍 インストール先: ~/Library/Caches/ms-playwright/\n');

try {
  // Chromiumのみインストール
  await installDefaultBrowsersForNpmInstall(['chromium']);
  console.log('\n✅ インストール完了！');
  console.log('📁 インストール先を確認:');

  const { run } = await import('node:process');
  await Deno.run({
    cmd: ['ls', '-la', `${Deno.env.get('HOME')}/Library/Caches/ms-playwright/`],
  }).status();
} catch (error) {
  console.error('❌ インストールエラー:', error);
  Deno.exit(1);
}
