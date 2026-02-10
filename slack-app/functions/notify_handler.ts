import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const NotifyHandlerDef = DefineFunction({
  callback_id: "notify_handler",
  title: "Notify Handler",
  description: "Forward release notification to Cloud Functions",
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
  async ({ inputs, env }) => {
    const cloudFunctionUrl = env["CLOUD_FUNCTION_URL"];
    const gcpSaKey = JSON.parse(env["GCP_SA_KEY"]);

    // サービスアカウントでIDトークン取得
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: await createSignedJwt(gcpSaKey, cloudFunctionUrl),
        }),
      },
    );
    const { id_token } = await tokenResponse.json();

    // Cloud Functionsへ転送
    const response = await fetch(cloudFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${id_token}`,
      },
      body: JSON.stringify({
        text: inputs.message_text,
        channel: inputs.channel_id,
        thread_ts: inputs.message_ts,
      }),
    });

    return {
      outputs: { status: response.ok ? "success" : "failed" },
    };
  },
);

// JWT署名ヘルパー（GCPサービスアカウント認証用）
async function createSignedJwt(
  saKey: { client_email: string; private_key: string },
  audience: string,
): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(
    JSON.stringify({
      iss: saKey.client_email,
      sub: saKey.client_email,
      aud: "https://oauth2.googleapis.com/token",
      target_audience: audience,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBinary(saKey.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
}

function pemToBinary(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
