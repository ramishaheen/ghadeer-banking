import { z } from "zod";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { executeTransfer } from "@/lib/transfers";

const TransferSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amountMils: z.number().int().positive().max(1_000_000_000),
  note: z.string().max(200).optional(),
});

export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const body = TransferSchema.parse(await req.json());
  const result = await executeTransfer({ userId: user.id, ...body });
  return ok({
    transactionId: result.transactionId,
    from: { id: result.from.id, name: result.from.name, balanceMils: result.from.balanceMils },
    to: { id: result.to.id, name: result.to.name, balanceMils: result.to.balanceMils },
  });
});
