import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { config } from "../config.ts";

export const SummarizeHandlerDef = DefineFunction({
  callback_id: "summarize_handler",
  title: "Summarize Handler",
  description: "Call Claude API to summarize and reply to Slack thread",
  source_file: "functions/summarize_handler.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      message_ts: { type: Schema.types.string },
      message_text: { type: Schema.types.string },
    },
    required: ["channel_id", "message_ts", "message_text"],
  },
  output_parameters: {
    properties: {
      status: { type: Schema.types.string },
    },
    required: ["status"],
  },
});

const SYSTEM_PROMPT = `以下のGitHubリリース通知を日本語で簡潔に要約してください。

## 要件
- 最初に総括メッセージ（1〜2文）
- 全ての項目についてまとめる
- カテゴリごとに整理
- 重要な新機能・変更点は太字で

## アウトプット例

Claude Code v1.0.5 がリリースされました。パフォーマンス改善とMCP関連の新機能が中心のアップデートです。

### 新機能
- **MCPサーバーのホットリロード対応** — 設定変更時に再起動不要に
- ターミナル出力のカラー表示に対応

### 改善
- **コンテキストウィンドウの使用効率が30%向上**
- ファイル検索の応答速度を改善

### バグ修正
- git操作時のタイムアウトエラーを修正
- 日本語入力時の文字化けを修正`;

export default SlackFunction(
  SummarizeHandlerDef,
  async ({ inputs, env, client }) => {
    const anthropicApiKey = env["ANTHROPIC_API_KEY"];

    try {
      // Step 1: Claude APIで要約
      const claudeResponse = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: config.claude.model,
            max_tokens: config.claude.maxTokens,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: inputs.message_text }],
          }),
        },
      );

      if (!claudeResponse.ok) {
        const errorBody = await claudeResponse.text();
        console.error(`Claude API error: ${claudeResponse.status} ${errorBody}`);
        await client.chat.postMessage({
          channel: inputs.channel_id,
          thread_ts: inputs.message_ts,
          text: `要約に失敗しました (Claude API error: ${claudeResponse.status})`,
        });
        return { outputs: { status: "claude_api_error" } };
      }

      const claudeResult = await claudeResponse.json();
      const summary = claudeResult.content[0].text;

      // Step 2: Slackスレッドに返信
      const slackResult = await client.chat.postMessage({
        channel: inputs.channel_id,
        thread_ts: inputs.message_ts,
        text: summary,
      });

      if (!slackResult.ok) {
        console.error(`Slack API error: ${slackResult.error}`);
        return { outputs: { status: "slack_api_error" } };
      }

      // Step 3: このメッセージ用のdigestトリガーを削除
      try {
        const triggerName = `digest-${inputs.message_ts}`;
        const triggers = await client.workflows.triggers.list();
        if (triggers.ok) {
          for (const t of triggers.triggers) {
            if (t.name === triggerName) {
              await client.workflows.triggers.delete({ trigger_id: t.id });
              break;
            }
          }
        }
      } catch (e) {
        console.error(`Trigger cleanup failed: ${e}`);
      }

      return { outputs: { status: "success" } };
    } catch (error) {
      console.error(`Unexpected error: ${error}`);
      await client.chat.postMessage({
        channel: inputs.channel_id,
        thread_ts: inputs.message_ts,
        text: `要約に失敗しました: ${error}`,
      });
      return { outputs: { status: "error" } };
    }
  },
);
