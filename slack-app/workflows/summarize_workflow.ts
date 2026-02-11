import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SummarizeHandlerDef } from "../functions/summarize_handler.ts";

export const SummarizeWorkflow = DefineWorkflow({
  callback_id: "summarize_workflow",
  title: "Summarize Workflow",
  description: "Summarize release notification with Claude and reply to thread",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      message_ts: { type: Schema.types.string },
      message_text: { type: Schema.types.string },
    },
    required: ["channel_id", "message_ts", "message_text"],
  },
});

SummarizeWorkflow.addStep(SummarizeHandlerDef, {
  channel_id: SummarizeWorkflow.inputs.channel_id,
  message_ts: SummarizeWorkflow.inputs.message_ts,
  message_text: SummarizeWorkflow.inputs.message_text,
});

export default SummarizeWorkflow;
