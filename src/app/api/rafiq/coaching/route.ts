import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { spendingByCategory } from "@/lib/insights";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const [current, previous, goals] = await Promise.all([
    spendingByCategory(user.id, 0),
    spendingByCategory(user.id, -1),
    prisma.savingsGoal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ]);

  const categories = [...new Set([...Object.keys(current), ...Object.keys(previous)])]
    .map((name) => ({
      name,
      currentMils: current[name] ?? 0,
      previousMils: previous[name] ?? 0,
    }))
    .sort((a, b) => b.currentMils - a.currentMils);

  const totalMils = categories.reduce((s, c) => s + c.currentMils, 0);

  return ok({ categories, totalMils, goals });
});
