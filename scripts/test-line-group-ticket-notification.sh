#!/bin/bash
#
# 浦和レッズチケット通知テスト（実際のメッセージ形式）
# Usage: ./scripts/test-urawa-ticket-notification.sh
#

set -euo pipefail

# 環境変数の読み込み
if [[ -f .env ]]; then
    source .env
fi

# 必要な環境変数のチェック
if [[ -z "${LINE_CHANNEL_ACCESS_TOKEN:-}" ]]; then
    echo "❌ エラー: LINE_CHANNEL_ACCESS_TOKEN が設定されていません"
    exit 1
fi

if [[ -z "${LINE_GROUP_ID:-}" ]]; then
    echo "❌ エラー: LINE_GROUP_ID が設定されていません"
    echo "   グループIDを .env で設定してください"
    exit 1
fi

echo "🎫 浦和レッズアウェイチケット通知テスト配信"
echo "📱 送信先グループID: ${LINE_GROUP_ID:0:10}..."
echo ""

# 実際のチケット通知メッセージ（Flex Message形式）
TICKET_MESSAGE='{
  "type": "flex",
  "altText": "【チケット販売通知】XXX vs 浦和レッズ",
  "contents": {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "🎫 チケット販売開始通知",
          "weight": "bold",
          "size": "lg",
          "color": "#DC143C"
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "lg",
          "spacing": "sm",
          "contents": [
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "⚽",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "XXX vs 浦和レッズ",
                  "wrap": true,
                  "color": "#666666",
                  "size": "md",
                  "flex": 5,
                  "weight": "bold"
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "📅",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "XXXX年XX月XX日(X) XX:XX",
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 5
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "🏟️",
                  "color": "#aaaaaa",
                  "size": "sm",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "XXXスタジアム",
                  "wrap": true,
                  "color": "#666666",
                  "size": "sm",
                  "flex": 5
                }
              ]
            },
            {
              "type": "separator",
              "margin": "md"
            },
            {
              "type": "box",
              "layout": "baseline",
              "spacing": "sm",
              "margin": "md",
              "contents": [
                {
                  "type": "text",
                  "text": "🚀",
                  "color": "#DC143C",
                  "size": "md",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "販売開始: XXXX年XX月XX日(X) XX:XX",
                  "wrap": true,
                  "color": "#DC143C",
                  "size": "md",
                  "flex": 5,
                  "weight": "bold"
                }
              ]
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "style": "primary",
          "height": "sm",
          "action": {
            "type": "uri",
            "label": "チケット購入ページ",
            "uri": "https://www.jleague-ticket.jp/"
          },
          "color": "#DC143C"
        },
        {
          "type": "spacer",
          "size": "sm"
        }
      ]
    }
  }
}'

# グループメッセージの送信
echo "📤 チケット通知メッセージを送信中..."

RESPONSE=$(curl -s -X POST https://api.line.me/v2/bot/message/push \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
    -d "{
        \"to\": \"${LINE_GROUP_ID}\",
        \"messages\": [${TICKET_MESSAGE}]
    }")

# レスポンスのチェック
if [[ "$RESPONSE" == "{}" || -z "$RESPONSE" || "$RESPONSE" == *"sentMessages"* ]]; then
    echo "✅ 浦和レッズチケット通知の配信テストが成功しました！"
    echo "📱 LINEグループでリッチメッセージを確認してください"
    echo ""
    echo "🎯 確認ポイント:"
    echo "   - 浦和レッズカラー（#DC143C）の表示"
    echo "   - アイコン付きの試合情報レイアウト"
    echo "   - チケット購入ページボタン"
    echo "   - メッセージの見やすさ・読みやすさ"
    
    # 送信成功の場合、メッセージIDも表示
    if [[ "$RESPONSE" == *"sentMessages"* ]]; then
        echo ""
        echo "📊 送信詳細: $RESPONSE"
    fi
else
    echo "❌ チケット通知配信テストに失敗しました"
    echo "   エラー内容: $RESPONSE"
    exit 1
fi

echo ""
echo "💡 本格運用時の通知内容:"
echo "   - XXX → 実際の対戦相手名"
echo "   - XXXX年XX月XX日 → 実際の試合日時"  
echo "   - XXXスタジアム → 実際の開催スタジアム名"
echo "   - 販売開始日時 → 実際のチケット販売開始時刻"