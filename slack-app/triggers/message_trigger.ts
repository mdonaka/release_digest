import {Trigger} from "deno-slack-api/types.ts";
import {TriggerEventTypes, TriggerTypes} from "deno-slack-api/mod.ts";
import {DigestWorkflow} from "../workflows/digest_workflow.ts";

const CHANNEL_ID = "C0ABJFC3T1S";

const trigger: Trigger<typeof DigestWorkflow.definition> = {
  type: TriggerTypes.Event,
  name: "Release notification trigger",
  description: "Triggers on GitHub release notifications",
  workflow: `#/workflows/${DigestWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.MessagePosted,
    channel_ids: [CHANNEL_ID],
  },
  inputs: {
    channel_id: {value: "{{data.channel_id}}"},
    message_ts: {value: "{{data.message_ts}}"},
    message_text: {value: "{{data.text}}"},
  },
};

export default trigger;
