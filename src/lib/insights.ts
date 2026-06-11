import { prisma } from "@/lib/db";
import { formatJodShort } from "@/lib/money";

function monthRange(offset: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end };
}

export async function spendingByCategory(userId: string, monthOffset = 0) {
  const { start, end } = monthRange(monthOffset);
  const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } });
  const accountIds = accounts.map((a) => a.id);

  const txns = await prisma.transaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: "DEBIT",
      createdAt: { gte: start, lt: end },
      category: { notIn: ["Transfer", "Gold"] },
    },
  });

  const byCategory = new Map<string, number>();
  for (const t of txns) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amountMils);
  }
  return Object.fromEntries(byCategory);
}

export async function monthFlow(userId: string) {
  const { start, end } = monthRange(0);
  const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } });
  const accountIds = accounts.map((a) => a.id);

  const txns = await prisma.transaction.findMany({
    where: { accountId: { in: accountIds }, createdAt: { gte: start, lt: end } },
  });

  let inMils = 0;
  let outMils = 0;
  for (const t of txns) {
    // Internal moves (own-account transfers, vault withdrawals) cancel out.
    if (t.category === "Transfer" || t.category === "CashbackWithdraw") continue;
    if (t.type === "CREDIT") inMils += t.amountMils;
    else outMils += t.amountMils;
  }
  return { inMils, outMils };
}

/** Computes (and persists) fresh insights from real transaction data. */
export async function computeInsights(userId: string) {
  const current = await spendingByCategory(userId, 0);
  const previous = await spendingByCategory(userId, -1);

  const existing = await prisma.insight.findMany({
    where: { userId, status: { in: ["NEW", "SEEN"] } },
  });
  const have = new Set(existing.map((i) => i.kind));

  // 1. Utilities month-over-month comparison (the designed insight).
  const utilNow = current["Utilities"] ?? 0;
  const utilPrev = previous["Utilities"] ?? 0;
  if (!have.has("SAVINGS_COMPARE") && utilPrev > utilNow && utilPrev > 0) {
    const savedMils = utilPrev - utilNow;
    await prisma.insight.create({
      data: {
        userId,
        kind: "SAVINGS_COMPARE",
        title: "You're saving on Utilities",
        titleAr: "أنت توفر في فواتير الخدمات",
        body: `You saved ${formatJodShort(savedMils)} more this month on Utilities than last month.`,
        bodyAr: `لقد وفرت ${formatJodShort(savedMils)} إضافية هذا الشهر على فواتير الخدمات مقارنة بالشهر الماضي.`,
        dataJson: JSON.stringify({ current: utilNow, previous: utilPrev, savedMils }),
      },
    });
  }

  // 2. Subscription audit.
  const accounts = await prisma.account.findMany({ where: { userId }, select: { id: true } });
  const subs = await prisma.transaction.findMany({
    where: {
      accountId: { in: accounts.map((a) => a.id) },
      category: "Subscriptions",
      createdAt: { gte: new Date(Date.now() - 35 * 24 * 3600_000) },
    },
  });
  const subTotal = subs.reduce((s, t) => s + t.amountMils, 0);
  if (!have.has("SUBSCRIPTION_AUDIT") && subTotal > 0) {
    await prisma.insight.create({
      data: {
        userId,
        kind: "SUBSCRIPTION_AUDIT",
        title: "Subscription check-in",
        titleAr: "مراجعة الاشتراكات",
        body: `You spend ${formatJodShort(subTotal)}/month on ${subs.length} subscriptions. Want a full breakdown?`,
        bodyAr: `تنفق ${formatJodShort(subTotal)} شهرياً على ${subs.length} اشتراكات. هل تريد تقريراً مفصلاً؟`,
        dataJson: JSON.stringify({
          totalMils: subTotal,
          items: subs.map((s) => ({ merchant: s.merchant, amountMils: s.amountMils })),
        }),
      },
    });
  }

  // 3. Goal acceleration tip.
  const goal = await prisma.savingsGoal.findFirst({ where: { userId } });
  if (goal && !have.has("GOAL_TIP") && goal.monthlyMils > 0 && goal.savedMils < goal.targetMils) {
    const extraMils = 20_000; // +JOD 20/month, per the designed coaching tip
    const remaining = goal.targetMils - goal.savedMils;
    const monthsNow = Math.ceil(remaining / goal.monthlyMils);
    const monthsFaster = Math.ceil(remaining / (goal.monthlyMils + extraMils));
    const saved = monthsNow - monthsFaster;
    if (saved >= 1) {
      await prisma.insight.create({
        data: {
          userId,
          kind: "GOAL_TIP",
          title: `Reach your ${goal.name} sooner`,
          titleAr: `حقق هدف "${goal.name}" أسرع`,
          body: `Great progress! Increasing your monthly contribution by JOD 20 will hit your goal ${saved} month${saved > 1 ? "s" : ""} early.`,
          bodyAr: `تقدم رائع! زيادة مساهمتك الشهرية بمقدار 20 دينار ستحقق هدفك قبل ${saved} ${saved > 1 ? "أشهر" : "شهر"}.`,
          dataJson: JSON.stringify({ goalId: goal.id, extraMils, monthsSaved: saved }),
        },
      });
    }
  }

  return prisma.insight.findMany({
    where: { userId, status: { in: ["NEW", "SEEN"] } },
    orderBy: { createdAt: "desc" },
  });
}
