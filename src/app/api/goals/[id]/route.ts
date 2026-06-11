import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

const PatchSchema = z.object({
  monthlyMils: z.number().int().min(0).optional(),
  addSavedMils: z.number().int().positive().optional(),
  name: z.string().min(1).max(80).optional(),
  targetMils: z.number().int().positive().optional(),
});

export const PATCH = withApi(async (req, ctx) => {
  const user = await requireSessionUser();
  const { id } = await ctx.params;
  const body = PatchSchema.parse(await req.json());

  const goal = await prisma.savingsGoal.findFirst({ where: { id, userId: user.id } });
  if (!goal) throw new ApiError(404, "Goal not found.");

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.targetMils ? { targetMils: body.targetMils } : {}),
      ...(body.monthlyMils !== undefined ? { monthlyMils: body.monthlyMils } : {}),
      ...(body.addSavedMils ? { savedMils: { increment: body.addSavedMils } } : {}),
    },
  });
  return ok({ goal: updated });
});
