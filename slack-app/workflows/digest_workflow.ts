import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { NotifyHandlerDef } from "../functions/notify_handler.ts";

export const DigestWorkflow = DefineWorkflow({
  callback_id: "digest_workflow",
  title: "Digest Workflow",
  description: "Receive release notification and schedule summarization",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      message_ts: { type: Schema.types.string },
      message_text: { type: Schema.types.string },
    },
    required: ["channel_id", "message_ts", "message_text"],
  },
});

DigestWorkflow.addStep(NotifyHandlerDef, {
  message_text: DigestWorkflow.inputs.message_text,
  channel_id: DigestWorkflow.inputs.channel_id,
  message_ts: DigestWorkflow.inputs.message_ts,
});

export default DigestWorkflow;
