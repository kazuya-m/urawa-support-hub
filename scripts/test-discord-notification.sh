#!/bin/bash
#
# Discord Webhook テスト通知スクリプト
# Usage: ./scripts/test-discord-notification.sh
#

set -euo pipefail

# 環境変数の読み込み
if [[ -f .env ]]; then
    source .env
fi

# 必要な環境変数のチェック
if [[ -z "${DISCORD_WEBHOOK_URL:-}" ]]; then
    echo "❌ エラー: DISCORD_WEBHOOK_URL が設定されていません"
    echo "   .env ファイルで DISCORD_WEBHOOK_URL を設定してください"
    exit 1
fi

echo "🧪 Discord Webhook テスト通知を送信中..."

# 現在時刻をISO8601形式で取得
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# テストメッセージの送信
RESPONSE=$(curl -s -w "%{http_code}" -X POST "${DISCORD_WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "{
        \"embeds\": [{
            \"title\": \"🧪 Urawa Support Hub テスト\",
            \"description\": \"システムが正常に動作しています\",
            \"color\": 65280,
            \"fields\": [
                {
                    \"name\": \"📊 ステータス\",
                    \"value\": \"正常\",
                    \"inline\": true
                },
                {
                    \"name\": \"⏰ 送信時刻\",
                    \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
                    \"inline\": true
                }
            ],
            \"timestamp\": \"${CURRENT_TIME}\",
            \"footer\": {
                \"text\": \"Urawa Support Hub Test\"
            }
        }]
    }")

# HTTPステータスコードを抽出（最後の3文字）
HTTP_CODE="${RESPONSE: -3}"
RESPONSE_BODY="${RESPONSE%???}"

# レスポンスのチェック
if [[ "$HTTP_CODE" -eq 204 ]]; then
    echo "✅ Discord Webhook テスト通知が正常に送信されました"
    echo "   Discordチャンネルでメッセージを確認してください"
elif [[ "$HTTP_CODE" -eq 200 ]]; then
    echo "✅ Discord Webhook テスト通知が正常に送信されました"
    echo "   Discordチャンネルでメッセージを確認してください"
else
    echo "❌ Discord Webhook テスト通知の送信に失敗しました"
    echo "   HTTPステータスコード: $HTTP_CODE"
    echo "   エラー内容: $RESPONSE_BODY"
    exit 1
fi