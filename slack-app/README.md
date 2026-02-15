# Slack App (Deno)

GitHub リリース通知を受信し、Claude API で日本語要約してスレッドに返信する Deno Slack App。

## 前提条件

- [Slack CLI](https://api.slack.com/automation/cli/install) がインストール済み
- Slack ワークスペースが**有料プラン（Pro 以上）**であること（次世代プラットフォームは無料プランでは利用不可）

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `ANTHROPIC_API_KEY` | Anthropic API キー |

デプロイ後、`slack env add` で環境変数を設定します:

```bash
slack env add ANTHROPIC_API_KEY <your-api-key>
```

> `SLACK_BOT_TOKEN` はDeno Slack SDKが自動で提供するため、手動設定は不要です。

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
