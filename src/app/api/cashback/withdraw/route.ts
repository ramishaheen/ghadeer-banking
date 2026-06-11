import { prisma } from "@/lib/db";
import { ApiError, requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

/**
 * Withdraws the full cashback vault balance into the user's checking account.
 * Vault balance = Cashback credits − prior CashbackWithdraw credits.
 */
export const POST = withApi(async () => {
  const user = await requireSessionUser();

  return await prisma.$transaction(async (tx) => {
    const accounts = await tx.account.findMany({ where: { userId: user.id } });
    const checking = accounts.find((a) => a.type === "CHECKING");
    if (!checking) throw new ApiError(404, "No checking account found.");

    const ids = accounts.map((a) => a.id);
    const earned = await tx.transaction.aggregate({
      where: { accountId: { in: ids }, category: "Cashback", type: "CREDIT" },
      _sum: { amountMils: true },
    });
    const withdrawn = await tx.transaction.aggregate({
      where: { accountId: { in: ids }, category: "CashbackWithdraw", type: "CREDIT" },
      _sum: { amountMils: true },
    });
    const available = (earned._sum.amountMils ?? 0) - (withdrawn._sum.amountMils ?? 0);
    if (available <= 0) throw new ApiError(422, "No cashback available to withdraw.");

    const updated = await tx.account.update({
      where: { id: checking.id },
      data: { balanceMils: { increment: available } },
    });
    await tx.transaction.create({
      data: {
        accountId: checking.id,
        type: "CREDIT",
        category: "CashbackWithdraw",
        merchant: "Cashback vault withdrawal",
        amountMils: available,
      },
    });

    return ok({ withdrawnMils: available, account: { id: updated.id, balanceMils: updated.balanceMils } });
  });
});
