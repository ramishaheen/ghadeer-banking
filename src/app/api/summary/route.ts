import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { monthFlow } from "@/lib/insights";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const { inMils, outMils } = await monthFlow(user.id);

  const [earned, withdrawn] = await Promise.all([
    prisma.transaction.aggregate({
      where: { account: { userId: user.id }, category: "Cashback", type: "CREDIT" },
      _sum: { amountMils: true },
    }),
    prisma.transaction.aggregate({
      where: { account: { userId: user.id }, category: "CashbackWithdraw", type: "CREDIT" },
      _sum: { amountMils: true },
    }),
  ]);

  return ok({
    monthInMils: inMils,
    monthOutMils: outMils,
    cashbackMils: (earned._sum.amountMils ?? 0) - (withdrawn._sum.amountMils ?? 0),
  });
});
