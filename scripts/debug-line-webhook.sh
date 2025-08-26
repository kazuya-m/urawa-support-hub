#!/bin/bash
#
# LINE Webhook動作デバッグスクリプト
#

set -euo pipefail

if [[ -f .env ]]; then
    source .env
fi

if [[ -z "${LINE_CHANNEL_ACCESS_TOKEN:-}" ]]; then
    echo "❌ エラー: LINE_CHANNEL_ACCESS_TOKEN が設定されていません"
    exit 1
fi

echo "🔍 LINE Webhook設定デバッグ"
echo ""

# Bot情報を取得
echo "📋 Bot情報取得中..."
curl -s -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
    https://api.line.me/v2/bot/info

echo -e "\n"
echo "💡 確認事項:"
echo "1. LINE Developers Console設定:"
echo "   - Webhook URL: https://discord.com/api/webhooks/1409819339770826782/P-CzuUXAmSBwSX2DpfiJuPY4zaZqN_s6FZNa_iqf7AVT38NwypiIxXUvwMlrLFZ62Wbf"
echo "   - Webhook の利用: 利用する"
echo "   - 応答メッセージ: 無効"
echo ""
echo "2. グループ設定:"
echo "   - Bot がグループメンバーになっている"
echo "   - 「グループトーク・複数人トークへの参加を許可する」が有効"
echo ""
echo "3. テスト方法:"
echo "   - グループで普通のメッセージを送信（Botに向けてでなく、普通の発言）"
echo "   - Discord #urawa-ticket-notifications チャンネルを確認"
echo ""
echo "🚨 よくある問題:"
echo "   - Webhook URL の入力ミス"
echo "   - 設定保存忘れ"
echo "   - ブラウザキャッシュの問題（ページ再読み込み）"