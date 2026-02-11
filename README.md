# Release Digest

GitHubのClaude Codeリリース通知をSlackで受信し、Claude APIで日本語要約してスレッドに返信するBot。

## アーキテクチャ

```
GitHub (anthropics/claude-code Releases)
    │ /github subscribe
    ▼
Deno Slack App
    ├── Step 1: メッセージ受信 → Scheduled Trigger作成（3秒以内）
    └── Step 2: Claude API要約 → Slackスレッド返信
        ├── Claude API (claude-opus-4-6)
        └── Slack API (chat.postMessage)
```

## ディレクトリ構成

```
├── slack-app/               # Deno Slack App
│   ├── functions/           #   カスタムFunction
│   │   ├── notify_handler.ts    # Scheduled Trigger作成
│   │   └── summarize_handler.ts # Claude要約 + Slack返信
│   ├── workflows/           #   ワークフロー定義
│   │   ├── digest_workflow.ts   # メッセージ受信
│   │   └── summarize_workflow.ts # 要約実行
│   └── triggers/            #   イベントトリガー
│       └── message_trigger.ts
└── CLAUDE.md
```

## セットアップ

### 前提条件

- Slack CLI (`slack` コマンド)
- Slack ワークスペースの管理権限
- Anthropic API キー

### 1. 環境変数の設定

```bash
# Slack App の環境変数を Slack CLI で設定
slack env add ANTHROPIC_API_KEY <your-key>
slack env add SLACK_BOT_TOKEN <your-token>
```

### 2. デプロイ

```bash
cd slack-app
slack deploy
```

### 3. トリガー作成

```bash
slack trigger create --trigger-def triggers/message_trigger.ts
```
