import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { formatJod } from "@/lib/money";
import { getCurrentGoldPrice } from "@/lib/gold";
import type { RafiqAction, RafiqReply } from "@/lib/rafiq";

// Claude-powered conversational layer for Rafiq. Grounded in the user's real
// records; every action it proposes is validated server-side before it
// reaches the client. Any failure falls back to the deterministic engine.

const MODEL = "claude-opus-4-8";

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export function aiAvailable(): boolean {
  return client !== null;
}

// ── Response schema (structured output + zod validation) ───────────────────
const ACTION_KINDS = [
  "navigate",
  "transfer_confirm",
  "view_report",
  "pay_bill",
  "set_alert",
  "quick_reply",
] as const;

const ReplySchema = z.object({
  content: z.string().min(1),
  contentAr: z.string().min(1),
  actions: z
    .array(
      z.object({
        label: z.string().min(1),
        labelAr: z.string().min(1),
        kind: z.enum(ACTION_KINDS),
        params: z
          .object({
            href: z.string().optional(),
            message: z.string().optional(),
            report: z.string().optional(),
            fromAccountId: z.string().optional(),
            toAccountId: z.string().optional(),
            amountMils: z.number().int().optional(),
            merchant: z.string().optional(),
            accountId: z.string().optional(),
            thresholdMils: z.number().int().optional(),
            direction: z.enum(["ABOVE", "BELOW"]).optional(),
            productId: z.string().optional(),
          })
          .optional(),
      })
    )
    .max(3),
});

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
} as const;

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

// ── Financial snapshot (real data, compact) ────────────────────────────────
async function buildSnapshot(userId: string): Promise<string> {
  const [user, accounts, txns, goals, alerts, { pricePerGramMils }] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.account.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { account: { userId } },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { account: { select: { type: true } } },
    }),
    prisma.savingsGoal.findMany({ where: { userId } }),
    prisma.priceAlert.count({ where: { userId, active: true } }),
    getCurrentGoldPrice(),
  ]);

  const lines: string[] = [];
  lines.push(`Customer: ${user?.name ?? "Customer"} (${user?.nameAr ?? ""}), membership ${user?.membership}, KYC status ${user?.kycStatus}.`);
  lines.push(`Accounts:`);
  for (const a of accounts) {
    lines.push(`- ${a.name} [id=${a.id}] type=${a.type} balance=${formatJod(a.balanceMils)}`);
  }
  lines.push(`Recent transactions (newest first):`);
  for (const t of txns) {
    const d = t.createdAt.toISOString().slice(0, 10);
    lines.push(`- ${d} ${t.type} ${formatJod(t.amountMils)} ${t.merchant} (${t.category}${t.recurring ? ", recurring" : ""}) on ${t.account.type}`);
  }
  if (goals.length) {
    lines.push(`Savings goals:`);
    for (const g of goals) {
      const pct = Math.min(100, Math.round((g.savedMils / g.targetMils) * 100));
      lines.push(`- ${g.name}: ${formatJod(g.savedMils)} of ${formatJod(g.targetMils)} (${pct}%), monthly ${formatJod(g.monthlyMils)}`);
    }
  }
  lines.push(`Live gold price: ${formatJod(pricePerGramMils)}/gram. Gold shop has PAMP bars 1g & 2.5g (out of stock), 5g, 10g, 20g, 50g.`);
  lines.push(`Active price alerts: ${alerts}.`);
  return lines.join("\n");
}

// ── Server-side action validation ──────────────────────────────────────────
const ALLOWED_HREFS = new Set([
  "/", "/hub", "/gold", "/gold/PAMP-5G", "/gold/PAMP-10G", "/gold/PAMP-20G",
  "/gold/PAMP-50G", "/rafiq", "/rafiq/chat", "/rafiq/coaching", "/rafiq/insights",
  "/rafiq/transfer", "/rafiq/voice", "/kyc", "/?tutorial=gold",
]);

async function validateActions(
  userId: string,
  actions: z.infer<typeof ReplySchema>["actions"]
): Promise<RafiqAction[]> {
  const accounts = await prisma.account.findMany({ where: { userId } });
  const accountIds = new Set(accounts.map((a) => a.id));
  const out: RafiqAction[] = [];

  for (const a of actions) {
    const p = a.params ?? {};
    switch (a.kind) {
      case "navigate":
        if (p.href && ALLOWED_HREFS.has(p.href)) out.push(a as RafiqAction);
        break;
      case "transfer_confirm": {
        const from = accounts.find((acc) => acc.id === p.fromAccountId);
        const valid =
          !!from &&
          !!p.toAccountId &&
          accountIds.has(p.toAccountId) &&
          p.fromAccountId !== p.toAccountId &&
          typeof p.amountMils === "number" &&
          p.amountMils > 0 &&
          p.amountMils <= from.balanceMils;
        if (valid) out.push(a as RafiqAction);
        break;
      }
      case "pay_bill":
        if (
          p.merchant &&
          typeof p.amountMils === "number" &&
          p.amountMils > 0 &&
          p.amountMils <= 5_000_000 &&
          (!p.accountId || accountIds.has(p.accountId))
        ) {
          const accountId = p.accountId ?? accounts.find((acc) => acc.type === "CHECKING")?.id;
          if (accountId) out.push({ ...a, params: { ...p, accountId } } as RafiqAction);
        }
        break;
      case "set_alert":
        if (
          typeof p.thresholdMils === "number" &&
          p.thresholdMils > 0 &&
          (p.direction === "ABOVE" || p.direction === "BELOW")
        ) {
          out.push(a as RafiqAction);
        }
        break;
      case "view_report":
        if (p.report === "subscriptions" || p.report === "spending") out.push(a as RafiqAction);
        break;
      case "quick_reply":
        if (p.message && p.message.length <= 200) out.push(a as RafiqAction);
        break;
    }
    if (out.length >= 3) break;
  }
  return out;
}

// ── Main entry ──────────────────────────────────────────────────────────────
export async function rafiqRespondAI(userId: string, message: string): Promise<RafiqReply | null> {
  if (!client) return null;

  try {
    const [snapshot, history] = await Promise.all([
      buildSnapshot(userId),
      prisma.chatMessage.findMany({
        where: { userId, sessionId: "default" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const historyLines = history
      .reverse()
      .map((m) => `${m.role === "user" ? "User" : "Rafiq"}: ${m.content}`)
      .join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: "json_schema", schema: OUTPUT_SCHEMA as unknown as Record<string, unknown> },
      },
      messages: [
        {
          role: "user",
          content: `FINANCIAL SNAPSHOT (authoritative, current):\n${snapshot}\n\nRECENT CONVERSATION:\n${historyLines || "(none)"}\n\nUSER MESSAGE:\n${message}`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) return null;

    const parsed = ReplySchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.warn("[rafiq-ai] schema validation failed, falling back:", parsed.error.message);
      return null;
    }

    const actions = await validateActions(userId, parsed.data.actions);
    return {
      content: parsed.data.content,
      contentAr: parsed.data.contentAr,
      actions,
    };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[rafiq-ai] Claude API error ${err.status} — falling back to rules engine. ${String(err.message).slice(0, 500)}`
      );
    } else {
      console.warn("[rafiq-ai] unexpected error — falling back to rules engine:", err);
    }
    return null;
  }
}
