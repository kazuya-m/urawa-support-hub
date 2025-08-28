#!/usr/bin/env -S deno run --allow-env --allow-read

import { load } from 'std/dotenv/mod.ts';

console.log('📝 .env読み込みテスト');
console.log('------------------------');

// .envファイルを読み込む（環境変数にエクスポート）
try {
  const envVars = await load({ export: true }); // export: true を追加
  console.log('✅ .envファイルを読み込みました');
  console.log('\n📋 読み込まれた環境変数:');
  for (const [key, value] of Object.entries(envVars)) {
    // 値の一部をマスク
    let maskedValue = value;
    if (key.includes('TOKEN') || key.includes('KEY')) {
      maskedValue = value.length > 10 ? `${value.slice(0, 10)}...` : '***';
    }
    console.log(`  ${key} = ${maskedValue}`);
  }
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ .envファイルの読み込みに失敗:', errorMessage);
}

console.log('\n📌 現在の環境変数 (Deno.env.get):');
console.log(
  '  LINE_CHANNEL_ACCESS_TOKEN:',
  Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ? '設定済み' : '未設定',
);
console.log('  SUPABASE_URL:', Deno.env.get('SUPABASE_URL') || '未設定');
console.log('  DISCORD_WEBHOOK_URL:', Deno.env.get('DISCORD_WEBHOOK_URL') ? '設定済み' : '未設定');
