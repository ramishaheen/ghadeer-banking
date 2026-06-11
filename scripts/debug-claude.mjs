// Minimal reproduction of the rafiq-ai request to see the exact 400 message.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] ??= m[2];
}

const client = new Anthropic();

const schema = {
  type: "object",
  properties: {
    content: { type: "string" },
    contentAr: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          labelAr: { type: "string" },
          kind: { type: "string", enum: ["navigate", "quick_reply"] },
          params: {
            type: "object",
            properties: { href: { type: "string" }, message: { type: "string" } },
            required: [],
            additionalProperties: false,
          },
        },
        required: ["label", "labelAr", "kind"],
        additionalProperties: false,
      },
    },
  },
  required: ["content", "contentAr", "actions"],
  additionalProperties: false,
};

try {
  const r = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    system: "Reply as JSON.",
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: "Say hello in English and Arabic with one quick_reply action." }],
  });
  console.log("OK:", r.content.find((b) => b.type === "text")?.text?.slice(0, 300));
} catch (e) {
  console.log("STATUS:", e.status);
  console.log("MESSAGE:", e.message?.slice(0, 600));
}
