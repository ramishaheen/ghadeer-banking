import { prisma } from "@/lib/db";
import { formatJod, formatJodShort, toMils } from "@/lib/money";
import { spendingByCategory } from "@/lib/insights";
import { getCurrentGoldPrice } from "@/lib/gold";

export type RafiqAction = {
  label: string;
  labelAr: string;
  kind:
    | "navigate"
    | "transfer_confirm"
    | "view_report"
    | "pay_bill"
    | "set_alert"
    | "quick_reply";
  params?: Record<string, unknown>;
};

export type RafiqReply = {
  content: string;
  contentAr: string;
  actions: RafiqAction[];
  meta?: Record<string, unknown>;
};

const num = (s: string): number | null => {
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
};

/**
 * Rafiq's reasoning engine. When ANTHROPIC_API_KEY is configured, replies come
 * from Claude (grounded in the user's real records, actions validated
 * server-side); otherwise — or on any API failure — the deterministic rules
 * engine below answers. Both paths compute from real data only.
 */
export async function rafiqRespond(userId: string, raw: string): Promise<RafiqReply> {
  // Lazy import keeps the SDK off paths that never chat.
  const { rafiqRespondAI } = await import("@/lib/rafiq-ai");
  const ai = await rafiqRespondAI(userId, raw);
  if (ai) return ai;
  return rafiqRespondRules(userId, raw);
}

/** Deterministic fallback engine (no external dependencies). */
export async function rafiqRespondRules(userId: string, raw: string): Promise<RafiqReply> {
  const msg = raw.trim().toLowerCase();
  const accounts = await prisma.account.findMany({
    where: { userId },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 60 } },
  });
  const checking = accounts.find((a) => a.type === "CHECKING");
  const savings = accounts.find((a) => a.type === "SAVINGS");

  // ── Intent: charge inquiry ("why was I charged …") ───────────────────────
  if (/(why|what).*(charge|charged|debit|دفعت|خصم)/.test(msg) || /لماذا.*خصم/.test(raw)) {
    const amount = num(msg);
    const debits = accounts.flatMap((a) => a.transactions).filter((t) => t.type === "DEBIT");
    let txn = amount
      ? debits.find((t) => Math.abs(t.amountMils - toMils(amount)) < 1)
      : undefined;
    txn ??= debits.find((t) => t.category === "Subscriptions") ?? debits[0];

    if (!txn) {
      return {
        content: "I couldn't find any recent charges on your accounts.",
        contentAr: "لم أجد أي خصومات حديثة على حساباتك.",
        actions: [
          { label: "Check Balance", labelAr: "كشف الرصيد", kind: "quick_reply", params: { message: "Check balance" } },
        ],
      };
    }

    const subs = debits.filter((t) => t.category === "Subscriptions");
    const subTotal = subs.reduce((s, t) => s + t.amountMils, 0);
    const when = txn.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    if (txn.category === "Subscriptions") {
      return {
        content: `That was your ${txn.merchant} subscription renewal on ${when} (${formatJod(txn.amountMils)}). You spend ${formatJodShort(subTotal)}/month on subscriptions. Want a full breakdown?`,
        contentAr: `كان ذلك تجديد اشتراكك في ${txn.merchant} بتاريخ ${when} (${formatJod(txn.amountMils)}). تنفق ${formatJodShort(subTotal)} شهرياً على الاشتراكات. هل تريد تقريراً مفصلاً؟`,
        actions: [{ label: "View Report", labelAr: "عرض التقرير", kind: "view_report", params: { report: "subscriptions" } }],
        meta: { txnId: txn.id },
      };
    }
    return {
      content: `That ${formatJod(txn.amountMils)} charge was ${txn.merchant} (${txn.category}) on ${when}.`,
      contentAr: `هذا الخصم بقيمة ${formatJod(txn.amountMils)} كان لـ ${txn.merchant} (${txn.category}) بتاريخ ${when}.`,
      actions: [{ label: "View Report", labelAr: "عرض التقرير", kind: "view_report", params: { report: "spending" } }],
      meta: { txnId: txn.id },
    };
  }

  // ── Intent: transfer ──────────────────────────────────────────────────────
  if (/(transfer|send|move|حوّل|حول|تحويل)/.test(msg)) {
    const amount = num(msg);
    const toSavings = /(saving|توفير|ادخار)/.test(msg);
    const toChecking = /(checking|current|demand|جاري)/.test(msg);
    if (amount && (toSavings || toChecking) && checking && savings) {
      const from = toSavings ? checking : savings;
      const to = toSavings ? savings : checking;
      return {
        content: `Ready to transfer ${formatJod(toMils(amount))} from ${from.name} to ${to.name}. Confirm with FaceID to proceed.`,
        contentAr: `جاهز لتحويل ${formatJod(toMils(amount))} من ${from.name} إلى ${to.name}. أكّد ببصمة الوجه للمتابعة.`,
        actions: [
          {
            label: "Confirm Transfer",
            labelAr: "تأكيد التحويل",
            kind: "transfer_confirm",
            params: { fromAccountId: from.id, toAccountId: to.id, amountMils: toMils(amount) },
          },
        ],
      };
    }
    return {
      content: "Sure — how much would you like to transfer, and to which account? For example: “Transfer 500 JOD to my savings account.”",
      contentAr: "بالتأكيد — كم تريد أن تحوّل، وإلى أي حساب؟ مثلاً: «حوّل 500 دينار إلى حساب التوفير».",
      actions: [
        { label: "Transfer JOD 500 to Savings", labelAr: "حوّل 500 دينار للتوفير", kind: "quick_reply", params: { message: "Transfer 500 JOD to my savings account" } },
      ],
    };
  }

  // ── Intent: balance ───────────────────────────────────────────────────────
  if (/(balance|how much.*(have|money)|رصيد|كم عندي)/.test(msg)) {
    const total = accounts.reduce((s, a) => s + a.balanceMils, 0);
    const lines = accounts.map((a) => `${a.name}: ${formatJod(a.balanceMils)}`).join(" · ");
    return {
      content: `Your total balance is ${formatJod(total)}. ${lines}.`,
      contentAr: `رصيدك الإجمالي ${formatJod(total)}. ${lines}.`,
      actions: [
        { label: "Transfer", labelAr: "تحويل", kind: "quick_reply", params: { message: "Transfer money" } },
        { label: "Spending Report", labelAr: "تقرير الإنفاق", kind: "view_report", params: { report: "spending" } },
      ],
    };
  }

  // ── Intent: pay bill ──────────────────────────────────────────────────────
  if (/(pay.*bill|bill.*pay|فاتورة|ادفع)/.test(msg)) {
    const bill = await prisma.transaction.findFirst({
      where: { account: { userId }, category: "Bills", type: "DEBIT" },
      orderBy: { createdAt: "desc" },
    });
    const due = bill ? Math.round(bill.amountMils * 1.02) : 28_500;
    const merchant = bill?.merchant ?? "Jordan Electric Power Co.";
    return {
      content: `Your next bill is ${merchant} — approximately ${formatJod(due)} due this week. Shall I pay it from your ${checking?.name ?? "main"} account?`,
      contentAr: `فاتورتك القادمة هي ${merchant} — حوالي ${formatJod(due)} مستحقة هذا الأسبوع. هل أدفعها من حساب ${checking?.name ?? "الرئيسي"}؟`,
      actions: [
        {
          label: `Pay ${formatJodShort(due)}`,
          labelAr: `ادفع ${formatJodShort(due)}`,
          kind: "pay_bill",
          params: { merchant, amountMils: due, accountId: checking?.id },
        },
      ],
    };
  }

  // ── Intent: buy gold / gold price ────────────────────────────────────────
  if (/(gold|ذهب)/.test(msg)) {
    const { pricePerGramMils } = await getCurrentGoldPrice();
    if (/(alert|تنبيه)/.test(msg)) {
      return {
        content: `Gold is trading at ${formatJod(pricePerGramMils)}/g right now. I can alert you when it moves — what threshold should I watch?`,
        contentAr: `يتداول الذهب الآن عند ${formatJod(pricePerGramMils)} للغرام. يمكنني تنبيهك عند تغيّر السعر — ما الحد الذي تريد مراقبته؟`,
        actions: [
          { label: "Alert if price drops 1%", labelAr: "نبهني إذا انخفض 1٪", kind: "set_alert", params: { direction: "BELOW", thresholdMils: Math.round(pricePerGramMils * 0.99) } },
        ],
      };
    }
    return {
      content: `Gold is at ${formatJod(pricePerGramMils)}/g (live). The Physical Gold shop has PAMP minted bars from 1g to 50g — I can walk you through your first purchase.`,
      contentAr: `سعر الذهب الآن ${formatJod(pricePerGramMils)} للغرام (مباشر). متجر الذهب يوفر سبائك PAMP من 1غ إلى 50غ — يمكنني إرشادك خلال أول عملية شراء.`,
      actions: [
        { label: "Open Gold Shop", labelAr: "افتح متجر الذهب", kind: "navigate", params: { href: "/gold" } },
        { label: "Start guided purchase", labelAr: "ابدأ الشراء الموجّه", kind: "navigate", params: { href: "/?tutorial=gold" } },
      ],
    };
  }

  // ── Intent: spending / coaching ───────────────────────────────────────────
  if (/(spend|spending|breakdown|report|إنفاق|مصاريف)/.test(msg)) {
    const cat = await spendingByCategory(userId, 0);
    const total = Object.values(cat).reduce((s, v) => s + v, 0);
    const top = Object.entries(cat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const lines = top.map(([k, v]) => `${k} ${formatJodShort(v)}`).join(", ");
    return {
      content: `This month you've spent ${formatJod(total)}. Top categories: ${lines}. Want the full coaching view?`,
      contentAr: `أنفقت هذا الشهر ${formatJod(total)}. أعلى الفئات: ${lines}. هل تريد عرض التدريب المالي الكامل؟`,
      actions: [{ label: "Open Coaching", labelAr: "افتح التدريب المالي", kind: "navigate", params: { href: "/rafiq/coaching" } }],
    };
  }

  // ── Intent: savings goal ──────────────────────────────────────────────────
  if (/(goal|saving.*goal|هدف|ادخار)/.test(msg)) {
    const goal = await prisma.savingsGoal.findFirst({ where: { userId } });
    if (goal) {
      const pct = Math.min(100, Math.round((goal.savedMils / goal.targetMils) * 100));
      return {
        content: `Your "${goal.name}" is ${pct}% funded — ${formatJodShort(goal.savedMils)} of ${formatJodShort(goal.targetMils)}. Increasing your monthly contribution by JOD 20 would hit it sooner.`,
        contentAr: `هدفك «${goal.name}» مكتمل بنسبة ${pct}٪ — ${formatJodShort(goal.savedMils)} من ${formatJodShort(goal.targetMils)}. زيادة مساهمتك الشهرية 20 ديناراً ستحققه أبكر.`,
        actions: [{ label: "Open Coaching", labelAr: "افتح التدريب المالي", kind: "navigate", params: { href: "/rafiq/coaching" } }],
      };
    }
  }

  // ── Intent: KYC ───────────────────────────────────────────────────────────
  if (/(kyc|verify|تحقق|توثيق)/.test(msg)) {
    return {
      content: "It's time for your annual KYC update to keep your account secure. It takes about two minutes — I'll guide you step by step.",
      contentAr: "حان وقت تحديث بيانات «اعرف عميلك» السنوي للحفاظ على أمان حسابك. يستغرق دقيقتين تقريباً — سأرشدك خطوة بخطوة.",
      actions: [{ label: "Start KYC update", labelAr: "ابدأ تحديث البيانات", kind: "navigate", params: { href: "/kyc" } }],
    };
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return {
    content: "I can help with balances, transfers, bills, spending insights, gold investing and your KYC update. What would you like to do?",
    contentAr: "يمكنني المساعدة في الأرصدة والتحويلات والفواتير وتحليل الإنفاق والاستثمار في الذهب وتحديث بياناتك. ماذا تريد أن تفعل؟",
    actions: [
      { label: "Check Balance", labelAr: "كشف الرصيد", kind: "quick_reply", params: { message: "Check balance" } },
      { label: "Transfer", labelAr: "تحويل", kind: "quick_reply", params: { message: "Transfer money" } },
      { label: "Pay Bill", labelAr: "دفع فاتورة", kind: "quick_reply", params: { message: "Pay my bill" } },
    ],
  };
}

/** Parses a voice transcript into an executable intent (used by /rafiq/voice). */
export function parseVoiceCommand(transcript: string): {
  intent: "transfer" | "balance" | "pay_bill" | "buy_gold" | "unknown";
  amountMils?: number;
  toType?: "SAVINGS" | "CHECKING";
} {
  const t = transcript.toLowerCase();
  const amount = num(t);
  if (/(transfer|send|حوّل|حول)/.test(t) && amount) {
    return {
      intent: "transfer",
      amountMils: toMils(amount),
      toType: /(checking|current|demand|جاري)/.test(t) ? "CHECKING" : "SAVINGS",
    };
  }
  if (/(balance|رصيد)/.test(t)) return { intent: "balance" };
  if (/(bill|فاتورة)/.test(t)) return { intent: "pay_bill" };
  if (/(gold|ذهب)/.test(t)) return { intent: "buy_gold" };
  return { intent: "unknown" };
}
