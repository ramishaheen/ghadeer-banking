import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { parseVoiceCommand } from "@/lib/rafiq";
import { formatJod } from "@/lib/money";

const CommandSchema = z.object({
  transcript: z.string().min(1).max(500),
});

/**
 * Voice command endpoint: parses a transcript into an intent and returns a
 * structured, confirmable action (execution happens via the relevant API
 * after the user confirms — matching the designed FaceID confirmation step).
 */
export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const { transcript } = CommandSchema.parse(await req.json());

  const parsed = parseVoiceCommand(transcript);
  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const checking = accounts.find((a) => a.type === "CHECKING");
  const savings = accounts.find((a) => a.type === "SAVINGS");

  switch (parsed.intent) {
    case "transfer": {
      const to = parsed.toType === "CHECKING" ? checking : savings;
      const from = parsed.toType === "CHECKING" ? savings : checking;
      if (!from || !to || !parsed.amountMils) break;
      return ok({
        intent: "transfer",
        speech: `Transferring ${formatJod(parsed.amountMils)} from ${from.name} to ${to.name}. Confirm with FaceID.`,
        confirm: {
          kind: "transfer",
          fromAccountId: from.id,
          fromName: from.name,
          toAccountId: to.id,
          toName: to.name,
          amountMils: parsed.amountMils,
        },
      });
    }
    case "balance": {
      const total = accounts.reduce((s, a) => s + a.balanceMils, 0);
      return ok({
        intent: "balance",
        speech: `Your total balance is ${formatJod(total)}.`,
        confirm: null,
      });
    }
    case "pay_bill":
      return ok({
        intent: "pay_bill",
        speech: "Opening your pending bills.",
        confirm: { kind: "navigate", href: "/rafiq/chat?prompt=Pay%20my%20bill" },
      });
    case "buy_gold":
      return ok({
        intent: "buy_gold",
        speech: "Opening the Physical Gold shop.",
        confirm: { kind: "navigate", href: "/gold" },
      });
  }

  return ok({
    intent: "unknown",
    speech: "Sorry, I didn't catch that. Try “Transfer 500 JOD to my savings account.”",
    confirm: null,
  });
});
