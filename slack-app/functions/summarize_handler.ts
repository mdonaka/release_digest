import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

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
- 重要な新機能・変更点を3〜5個の箇条書きで
- 技術的な詳細は省略してOK
- 破壊的変更があれば⚠️をつけて強調`;

export default SlackFunction(
  SummarizeHandlerDef,
  async ({ inputs, env }) => {
    const anthropicApiKey = env["ANTHROPIC_API_KEY"];
    const slackBotToken = env["SLACK_BOT_TOKEN"];

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
            model: "claude-opus-4-6",
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: inputs.message_text }],
          }),
        },
      );

      if (!claudeResponse.ok) {
        const errorBody = await claudeResponse.text();
        console.error(`Claude API error: ${claudeResponse.status} ${errorBody}`);
        return { outputs: { status: "claude_api_error" } };
      }

      const claudeResult = await claudeResponse.json();
      const summary = claudeResult.content[0].text;

      // Step 2: Slackスレッドに返信
      const slackResponse = await fetch(
        "https://slack.com/api/chat.postMessage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${slackBotToken}`,
          },
          body: JSON.stringify({
            channel: inputs.channel_id,
            thread_ts: inputs.message_ts,
            text: summary,
          }),
        },
      );

      const slackResult = await slackResponse.json();
      if (!slackResult.ok) {
        console.error(`Slack API error: ${slackResult.error}`);
        return { outputs: { status: "slack_api_error" } };
      }

      return { outputs: { status: "success" } };
    } catch (error) {
      console.error(`Unexpected error: ${error}`);
      return { outputs: { status: "error" } };
    }
  },
);
