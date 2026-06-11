import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { payBill } from "@/lib/transfers";

const PayBillSchema = z.object({
  accountId: z.string().min(1),
  merchant: z.string().min(1).max(120),
  amountMils: z.number().int().positive().max(1_000_000_000),
});

export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const body = PayBillSchema.parse(await req.json());
  const result = await payBill({ userId: user.id, ...body });
  return ok({
    transactionId: result.transactionId,
    account: {
      id: result.account.id,
      name: result.account.name,
      balanceMils: result.account.balanceMils,
    },
  });
});
