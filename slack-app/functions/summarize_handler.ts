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
      trigger_id: { type: Schema.types.string },
    },
    required: ["channel_id", "message_ts", "message_text", "trigger_id"],
  },
  output_parameters: {
    properties: {
      status: { type: Schema.types.string },
    },
    required: ["status"],
  },
});

const SYSTEM_PROMPT = `以下のGitHubリリース通知を日本語で簡潔に要約してください。

*要件*
• 最初に総括メッセージ（1〜2文）
• 全ての項目についてまとめる
• カテゴリごとに整理
• 重要な新機能・変更点は太字（*太字*）で
• Slack mrkdwn記法で出力すること（見出しは太字、リストは「•」）

*アウトプット例*

Claude Code v1.0.5 がリリースされました。パフォーマンス改善とMCP関連の新機能が中心のアップデートです。

*新機能*
• *MCPサーバーのホットリロード対応* — 設定変更時に再起動不要に
• ターミナル出力のカラー表示に対応

*改善*
• *コンテキストウィンドウの使用効率が30%向上*
• ファイル検索の応答速度を改善

*バグ修正*
• git操作時のタイムアウトエラーを修正
• 日本語入力時の文字化けを修正`;

/**
 * Slack APIからメッセージ全文を取得する。
 * GitHubボットはblocks/attachmentsのみでtextが空のことがあるため、
 * conversations.historyで再取得してテキストを組み立てる。
 */
async function fetchMessageText(
  client: { conversations: { history: (args: Record<string, unknown>) => Promise<Record<string, unknown>> } },
  channelId: string,
  messageTs: string,
): Promise<string> {
  const result = await client.conversations.history({
    channel: channelId,
    latest: messageTs,
    inclusive: true,
    limit: 1,
  });

  if (!result.ok || !Array.isArray(result.messages) || result.messages.length === 0) {
    return "";
  }

  const msg = result.messages[0] as Record<string, unknown>;
  const parts: string[] = [];

  // 本文テキスト
  if (typeof msg.text === "string" && msg.text.trim()) {
    parts.push(msg.text);
  }

  // attachments（GitHub bot が使うフォーマット）
  if (Array.isArray(msg.attachments)) {
    for (const att of msg.attachments as Record<string, unknown>[]) {
      if (typeof att.text === "string" && att.text.trim()) {
        parts.push(att.text);
      } else if (typeof att.fallback === "string" && att.fallback.trim()) {
        parts.push(att.fallback);
      }
    }
  }

  // blocks 内の rich_text
  if (Array.isArray(msg.blocks)) {
    for (const block of msg.blocks as Record<string, unknown>[]) {
      if (block.type === "section" && typeof (block as Record<string, { text?: string }>).text?.text === "string") {
        const sectionText = ((block as Record<string, { text: string }>).text).text;
        if (sectionText.trim() && !parts.includes(sectionText)) {
          parts.push(sectionText);
        }
      }
    }
  }

  return parts.join("\n\n");
}

export default SlackFunction(
  SummarizeHandlerDef,
  async ({ inputs, env, client }) => {
    const anthropicApiKey = env["ANTHROPIC_API_KEY"];
    let status = "success";

    try {
      // Step 0: message_textが空ならSlack APIで再取得
      let messageText = inputs.message_text?.trim() || "";
      if (!messageText) {
        console.log("message_text is empty, fetching from Slack API...");
        messageText = await fetchMessageText(
          client as unknown as Parameters<typeof fetchMessageText>[0],
          inputs.channel_id,
          inputs.message_ts,
        );
        if (!messageText) {
          console.error("Failed to fetch message text from Slack API");
          await client.chat.postMessage({
            channel: inputs.channel_id,
            thread_ts: inputs.message_ts,
            text: "要約に失敗しました: メッセージ本文を取得できませんでした",
          });
          return { outputs: { status: "empty_message" } };
        }
        console.log(`Fetched message text (${messageText.length} chars)`);
      }

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
            messages: [{ role: "user", content: messageText }],
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
        status = "claude_api_error";
        return { outputs: { status } };
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
        status = "slack_api_error";
      }

      return { outputs: { status } };
    } catch (error) {
      console.error(`Unexpected error: ${error}`);
      await client.chat.postMessage({
        channel: inputs.channel_id,
        thread_ts: inputs.message_ts,
        text: `要約に失敗しました: ${error}`,
      });
      status = "error";
      return { outputs: { status } };
    } finally {
      try {
        await client.workflows.triggers.delete({ trigger_id: inputs.trigger_id });
      } catch (e) {
        console.error(`Trigger cleanup failed: ${e}`);
      }
    }
  },
);
