import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const goals = await prisma.savingsGoal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return ok({ goals });
});

const GoalSchema = z.object({
  name: z.string().min(1).max(80),
  targetMils: z.number().int().positive(),
  monthlyMils: z.number().int().min(0).default(0),
});

export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const body = GoalSchema.parse(await req.json());
  const goal = await prisma.savingsGoal.create({
    data: { userId: user.id, ...body },
  });
  return ok({ goal }, { status: 201 });
});
