# CLAUDE.md

## プロジェクト構成

Deno Slack App のみの構成。

| ディレクトリ | 技術 | 用途 |
|-------------|------|------|
| `slack-app/` | Deno Slack SDK | Claude要約 + Slackスレッド返信 |

## 開発

```bash
# ローカル実行
cd slack-app && slack run

# デプロイ
cd slack-app && slack deploy

# トリガー作成
cd slack-app && slack trigger create --trigger-def triggers/message_trigger.ts
```

## envファイル

`slack-app/.env.example` を参照。
Slack CLI の `slack env add` で環境変数を設定。
