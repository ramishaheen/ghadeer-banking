import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/session";

/**
 * Executes an internal transfer atomically: both balances move together or
 * not at all, and mirrored Transfer transactions are recorded on each side.
 */
export async function executeTransfer(opts: {
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amountMils: number;
  note?: string;
}) {
  const { userId, fromAccountId, toAccountId, amountMils, note } = opts;

  if (amountMils <= 0) throw new ApiError(400, "Amount must be greater than zero.");
  if (fromAccountId === toAccountId) throw new ApiError(400, "Source and destination accounts must differ.");

  return prisma.$transaction(async (tx) => {
    const from = await tx.account.findFirst({ where: { id: fromAccountId, userId } });
    const to = await tx.account.findFirst({ where: { id: toAccountId, userId } });
    if (!from || !to) throw new ApiError(404, "Account not found.");
    if (from.balanceMils < amountMils) {
      throw new ApiError(422, `Insufficient funds in ${from.name}.`);
    }

    const updatedFrom = await tx.account.update({
      where: { id: from.id },
      data: { balanceMils: { decrement: amountMils } },
    });
    const updatedTo = await tx.account.update({
      where: { id: to.id },
      data: { balanceMils: { increment: amountMils } },
    });

    const debit = await tx.transaction.create({
      data: {
        accountId: from.id,
        type: "DEBIT",
        category: "Transfer",
        merchant: `To ${to.name}`,
        amountMils,
        note: note ?? null,
      },
    });
    await tx.transaction.create({
      data: {
        accountId: to.id,
        type: "CREDIT",
        category: "Transfer",
        merchant: `From ${from.name}`,
        amountMils,
        note: note ?? null,
      },
    });

    // Keep savings-goal progress in sync when money lands in savings.
    if (to.type === "SAVINGS") {
      const goal = await tx.savingsGoal.findFirst({ where: { userId } });
      if (goal) {
        await tx.savingsGoal.update({
          where: { id: goal.id },
          data: { savedMils: { increment: amountMils } },
        });
      }
    }

    return { from: updatedFrom, to: updatedTo, transactionId: debit.id };
  });
}

/** Pays a bill from an account: debits balance and records a Bills transaction. */
export async function payBill(opts: {
  userId: string;
  accountId: string;
  merchant: string;
  amountMils: number;
}) {
  const { userId, accountId, merchant, amountMils } = opts;
  if (amountMils <= 0) throw new ApiError(400, "Amount must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    const account = await tx.account.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new ApiError(404, "Account not found.");
    if (account.balanceMils < amountMils) throw new ApiError(422, `Insufficient funds in ${account.name}.`);

    const updated = await tx.account.update({
      where: { id: account.id },
      data: { balanceMils: { decrement: amountMils } },
    });
    const txn = await tx.transaction.create({
      data: {
        accountId: account.id,
        type: "DEBIT",
        category: "Bills",
        merchant,
        amountMils,
        note: "Paid via Rafiq",
      },
    });
    return { account: updated, transactionId: txn.id };
  });
}
