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

## セットアップ

### 前提条件

- Slack CLI (`slack` コマンド)
- Slack ワークスペースの管理権限
- Anthropic API キー

### 1. 環境変数の設定

| 変数 | 取得方法 |
|------|---------|
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) → API Keys → Create Key |

```bash
slack env add ANTHROPIC_API_KEY <your-key>
```

### 2. チャンネルIDの設定

`triggers/message_trigger.ts` の `CHANNEL_ID` を対象チャンネルのIDに書き換える。

チャンネルIDの確認方法: Slackでチャンネル名を右クリック → 「チャンネル詳細を表示」→ 最下部にIDが表示される。

### 3. デプロイ

```bash
cd slack-app
slack deploy
```

### 4. トリガー作成

```bash
slack trigger create --trigger-def triggers/message_trigger.ts
```
