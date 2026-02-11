import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { SummarizeWorkflow } from "../workflows/summarize_workflow.ts";

export const NotifyHandlerDef = DefineFunction({
  callback_id: "notify_handler",
  title: "Notify Handler",
  description: "Create a scheduled trigger to process release notification",
  source_file: "functions/notify_handler.ts",
  input_parameters: {
    properties: {
      message_text: { type: Schema.types.string },
      channel_id: { type: Schema.slack.types.channel_id },
      message_ts: { type: Schema.types.string },
    },
    required: ["message_text", "channel_id", "message_ts"],
  },
  output_parameters: {
    properties: {
      status: { type: Schema.types.string },
    },
    required: ["status"],
  },
});

export default SlackFunction(
  NotifyHandlerDef,
  async ({ inputs, client }) => {
    try {
      const triggerResponse = await client.workflows.triggers.create<
        typeof SummarizeWorkflow.definition
      >({
        type: TriggerTypes.Scheduled,
        name: `digest-${inputs.message_ts}`,
        workflow: `#/workflows/${SummarizeWorkflow.definition.callback_id}`,
        inputs: {
          channel_id: { value: inputs.channel_id },
          message_ts: { value: inputs.message_ts },
          message_text: { value: inputs.message_text },
        },
        schedule: {
          start_time: new Date(Date.now() + 60000).toISOString(),
          timezone: "UTC",
          frequency: { type: "once" },
        },
      });

      if (!triggerResponse.ok) {
        console.error(`Trigger creation failed: ${triggerResponse.error}`);
        return { outputs: { status: "trigger_creation_failed" } };
      }

      return { outputs: { status: "scheduled" } };
    } catch (error) {
      console.error(`Unexpected error: ${error}`);
      return { outputs: { status: "error" } };
    }
  },
);
