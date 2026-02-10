import { Manifest } from "deno-slack-sdk/mod.ts";
import { DigestWorkflow } from "./workflows/digest_workflow.ts";

export default Manifest({
  name: "release-digest",
  description: "Summarize GitHub release notifications with Claude",
  icon: "assets/icon.png",
  workflows: [DigestWorkflow],
  outgoingDomains: [],  // Cloud Functions URLのドメインを追加
  botScopes: [
    "channels:history",
    "chat:write",
  ],
});
