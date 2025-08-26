#!/bin/bash
#
# LINE Bot グループ配信テストスクリプト
# Usage: ./scripts/test-line-group.sh [GROUP_ID]
#

set -euo pipefail

# 環境変数の読み込み
if [[ -f .env ]]; then
    source .env
fi

# 必要な環境変数のチェック
if [[ -z "${LINE_CHANNEL_ACCESS_TOKEN:-}" ]]; then
    echo "❌ エラー: LINE_CHANNEL_ACCESS_TOKEN が設定されていません"
    echo "   .env ファイルで LINE_CHANNEL_ACCESS_TOKEN を設定してください"
    exit 1
fi

# グループIDの取得（引数または環境変数から）
GROUP_ID="${1:-${LINE_GROUP_ID:-}}"

if [[ -z "$GROUP_ID" ]]; then
    echo "❌ エラー: グループIDが指定されていません"
    echo ""
    echo "使用方法:"
    echo "  ./scripts/test-line-group.sh GROUP_ID"
    echo "  または .env で LINE_GROUP_ID を設定"
    echo ""
    echo "💡 グループID取得方法:"
    echo "  1. BotをLINEグループに追加"
    echo "  2. 一時的にWebhookを有効にしてBotにメッセージ送信"
    echo "  3. 受信データの source.groupId を確認"
    echo "  4. グループIDは 'C' で始まる約33文字の文字列"
    exit 1
fi

echo "🧪 LINE Bot グループ配信テストを送信中..."
echo "📱 送信先グループID: ${GROUP_ID:0:10}..."

# グループメッセージの送信
RESPONSE=$(curl -s -X POST https://api.line.me/v2/bot/message/push \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
    -d "{
        \"to\": \"${GROUP_ID}\",
        \"messages\": [{
            \"type\": \"text\",
            \"text\": \"🧪 グループ配信テスト\\n\\nBotからグループへのメッセージ配信テストです。\\n\\n送信時刻: $(date '+%Y-%m-%d %H:%M:%S')\"
        }]
    }")

# レスポンスのチェック
if [[ "$RESPONSE" == "{}" || -z "$RESPONSE" ]]; then
    echo "✅ グループ配信テストが正常に送信されました"
    echo "📱 LINEグループでメッセージを確認してください"
    echo ""
    echo "💡 メッセージが届かない場合:"
    echo "   1. Botがグループのメンバーになっているか確認"
    echo "   2. グループIDが正しいか確認（'C' で始まる33文字）"
    echo "   3. LINE_CHANNEL_ACCESS_TOKEN が正しいか確認"
else
    echo "❌ グループ配信テストの送信に失敗しました"
    echo "   エラー内容: $RESPONSE"
    echo ""
    echo "💡 よくあるエラー:"
    echo "   - Invalid 'to' parameter: グループIDが間違っている"
    echo "   - Forbidden: Botがグループメンバーでない"
    exit 1
fi