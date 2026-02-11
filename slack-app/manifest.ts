import { Manifest } from "deno-slack-sdk/mod.ts";
import { DigestWorkflow } from "./workflows/digest_workflow.ts";
import { SummarizeWorkflow } from "./workflows/summarize_workflow.ts";

export default Manifest({
  name: "release-digest",
  description: "Summarize GitHub release notifications with Claude",
  icon: "assets/icon.png",
  workflows: [DigestWorkflow, SummarizeWorkflow],
  outgoingDomains: [
    "api.anthropic.com",
    "slack.com",
  ],
  botScopes: [
    "channels:history",
    "chat:write",
    "triggers:write",
    "triggers:read",
  ],
});
