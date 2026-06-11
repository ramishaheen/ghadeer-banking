// Full reproduction with the exact schema + system prompt from rafiq-ai.ts.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] ??= m[2];
}

const client = new Anthropic();

const ACTION_KINDS = ["navigate", "transfer_confirm", "view_report", "pay_bill", "set_alert", "quick_reply"];

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    content: { type: "string", description: "Reply in English. Concise, 1-3 sentences." },
    contentAr: { type: "string", description: "The same reply in Arabic." },
    actions: {
      type: "array",
      description: "0-3 action chips the user can tap.",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          labelAr: { type: "string" },
          kind: { type: "string", enum: [...ACTION_KINDS] },
          params: {
            type: "object",
            properties: {
              href: { type: "string" },
              message: { type: "string" },
              report: { type: "string" },
              fromAccountId: { type: "string" },
              toAccountId: { type: "string" },
              amountMils: { type: "integer" },
              merchant: { type: "string" },
              accountId: { type: "string" },
              thresholdMils: { type: "integer" },
              direction: { type: "string", enum: ["ABOVE", "BELOW"] },
              productId: { type: "string" },
            },
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

const SYSTEM_PROMPT = `You are Rafiq (رفيق), the AI banking companion inside Rafiq+, Bank al Etihad's mobile app (Jordan, currency JOD with 3 decimal places).

Personality: professional, warm, precise — a trusted banker, not a chatbot. Keep replies to 1-3 short sentences. Never invent data: answer ONLY from the financial snapshot provided in the conversation. If the snapshot doesn't contain what you need, say so and offer the closest real action.

Always produce both English (content) and Arabic (contentAr) versions of your reply. The Arabic must be natural Modern Standard Arabic, not a literal translation.

You may attach up to 3 action chips. Allowed kinds and when to use them:
- quick_reply {message}: suggest a follow-up the user can send (e.g. "Check balance").
- navigate {href}: open an app screen. Allowed hrefs ONLY: /, /hub, /gold, /gold/PAMP-5G, /gold/PAMP-10G, /gold/PAMP-20G, /gold/PAMP-50G, /rafiq, /rafiq/chat, /rafiq/coaching, /rafiq/insights, /rafiq/transfer, /rafiq/voice, /kyc, /?tutorial=gold
- transfer_confirm {fromAccountId, toAccountId, amountMils}: ONLY when the user clearly asked to move a specific amount between their own two accounts. Use the exact account ids from the snapshot. amountMils = JOD × 1000.
- pay_bill {merchant, amountMils, accountId}: ONLY when the user asked to pay a bill shown in the snapshot.
- view_report {report}: report is "subscriptions" or "spending".
- set_alert {thresholdMils, direction}: gold price alerts only.

Money formatting in text: "JOD 1,234.567". Be exact with figures from the snapshot. For transfers, never exceed the source account balance. Do not discuss topics unrelated to the user's banking, money, or this app — politely steer back.`;

const userMsg = `FINANCIAL SNAPSHOT (authoritative, current):
Customer: Ahmed (أحمد), membership Standard, KYC status SUBMITTED.
Accounts:
- Regular Demand [id=cmq9lk6jg00020sz3ilb2i1ad] type=CHECKING balance=JOD 11,304.470
- Savings Account [id=cmq9lk6k100040sz3qwriaq6q] type=SAVINGS balance=JOD 30,978.740
Recent transactions (newest first):
- 2026-06-11 DEBIT JOD 567.015 PAMP Suisse 5g bar × 1 (Gold) on CHECKING
- 2026-06-11 DEBIT JOD 500.000 To Savings Account (Transfer) on CHECKING
- 2026-06-10 DEBIT JOD 10.990 Netflix (Subscriptions, recurring) on CHECKING
Savings goals:
- New Car Goal: JOD 6,500.000 of JOD 8,000.000 (81%), monthly JOD 250.000
Live gold price: JOD 108.271/gram. Gold shop has PAMP bars 1g & 2.5g (out of stock), 5g, 10g, 20g, 50g.
Active price alerts: 1.

RECENT CONVERSATION:
(none)

USER MESSAGE:
Compare my dining and groceries spending this month and tell me one realistic way to save`;

try {
  const r = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [{ role: "user", content: userMsg }],
  });
  console.log("OK:", r.content.find((b) => b.type === "text")?.text?.slice(0, 400));
} catch (e) {
  console.log("STATUS:", e.status);
  console.log("MESSAGE:", String(e.message).slice(0, 800));
}
