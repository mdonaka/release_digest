# Release Digest

GitHubのClaude Codeリリース通知をSlackで受信し、Claude APIで日本語要約してスレッドに返信するBot。

## アーキテクチャ

```
GitHub (anthropics/claude-code Releases)
    │ /github subscribe
    ▼
Deno Slack App (イベント受信・bot_idフィルタ)
    │ HTTP POST (GCP IAM認証)
    ▼
Cloud Functions - Go (要約生成・スレッド返信)
    ├── Claude API (claude-opus-4-6)
    └── Slack API (chat.postMessage)
```

## ディレクトリ構成

```
├── docker-compose.yml       # 開発環境
├── slack-app/               # Deno Slack App
│   ├── functions/           #   カスタムFunction
│   ├── workflows/           #   ワークフロー定義
│   └── triggers/            #   イベントトリガー
├── cloud-functions/         # Go Cloud Function
│   ├── cmd/                 #   エントリポイント
│   └── internal/            #   ビジネスロジック
│       ├── handler/         #     HTTPハンドラー
│       ├── claude/          #     Claude APIクライアント
│       └── slack/           #     Slack APIクライアント
└── terraform/               # GCPインフラ定義
```

## セットアップ

### 前提条件

- Docker / Docker Compose
- Slack ワークスペースの管理権限
- GCP プロジェクト
- Anthropic API キー

### 1. 環境変数の設定

```bash
cp .env.example .env
# .env を編集してAPIキー等を設定
```

### 2. 開発環境の起動

```bash
# Cloud Functions (Go) の開発サーバー起動
docker compose up cloud-functions

# テスト実行
docker compose run --rm cloud-functions go test ./... -v
```

### 3. Slack App のデプロイ

```bash
docker compose run --rm slack-app slack deploy
```

### 4. インフラのプロビジョニング

```bash
docker compose run --rm terraform init
docker compose run --rm terraform plan
docker compose run --rm terraform apply
```

## テスト

```bash
docker compose run --rm cloud-functions go test ./... -v
```

| パッケージ | テスト数 | 内容 |
|-----------|---------|------|
| `internal/claude` | 2 | Claude API 正常系・エラー系 |
| `internal/slack` | 2 | Slack API 正常系・エラー系 |
| `internal/handler` | 3 | ハンドラー 正常系・不正JSON・必須フィールド欠落 |
