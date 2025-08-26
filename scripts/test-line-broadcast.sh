#!/bin/bash
#
# LINE Bot ブロードキャスト配信テストスクリプト
# すべての友だちにメッセージを配信
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

echo "📢 LINE Bot ブロードキャスト配信テストを送信中..."
echo "💡 Botと友だちになっているユーザー全員に配信されます"

# ブロードキャストメッセージの送信
RESPONSE=$(curl -s -X POST https://api.line.me/v2/bot/message/broadcast \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
    -d "{
        \"messages\": [{
            \"type\": \"text\",
            \"text\": \"🧪 Urawa Support Hub テスト配信\\n\\n浦和レッズチケット通知システムのテストです。\\n\\n送信時刻: $(date '+%Y-%m-%d %H:%M:%S')\"
        }]
    }")

# レスポンスのチェック
if [[ "$RESPONSE" == "{}" || -z "$RESPONSE" ]]; then
    echo "✅ ブロードキャスト配信が正常に送信されました"
    echo "📱 LINEアプリでメッセージを確認してください"
    echo ""
    echo "💡 メッセージが届かない場合:"
    echo "   1. Botと友だちになっているか確認"
    echo "   2. Botをブロックしていないか確認" 
    echo "   3. LINE_CHANNEL_ACCESS_TOKEN が正しいか確認"
else
    echo "❌ ブロードキャスト配信の送信に失敗しました"
    echo "   エラー内容: $RESPONSE"
    exit 1
fi