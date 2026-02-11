# Slack App (Deno)

GitHub リリース通知を受信し、Claude API で日本語要約してスレッドに返信する Deno Slack App。

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `ANTHROPIC_API_KEY` | Anthropic API キー |
| `SLACK_BOT_TOKEN` | Slack Bot トークン |

## デプロイ

```bash
slack deploy
```

## トリガー作成

```bash
slack trigger create --trigger-def triggers/message_trigger.ts
```

## ディレクトリ構成

```
├── manifest.ts              # アプリマニフェスト
├── functions/
│   ├── notify_handler.ts    # Scheduled Trigger作成Function
│   └── summarize_handler.ts # Claude要約 + Slack返信Function
├── workflows/
│   ├── digest_workflow.ts   # メッセージ受信ワークフロー
│   └── summarize_workflow.ts # 要約実行ワークフロー
├── triggers/
│   └── message_trigger.ts   # メッセージトリガー
└── slack.json
```
