import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

export const GET = withApi(async (req) => {
  const user = await requireSessionUser();
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 30), 100);

  const transactions = await prisma.transaction.findMany({
    where: {
      account: { userId: user.id, ...(accountId ? { id: accountId } : {}) },
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { account: { select: { name: true, type: true } } },
  });
  return ok({ transactions });
});
