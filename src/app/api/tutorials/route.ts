import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

const KEYS = ["GOLD_BUY", "KYC_UPDATE", "HUB_INVEST_TIP", "HOME_AI_TIP", "GOLD_SMART_TIP"] as const;

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const rows = await prisma.tutorialProgress.findMany({ where: { userId: user.id } });
  const progress: Record<string, { step: number; dismissed: boolean; completed: boolean }> = {};
  for (const key of KEYS) {
    const row = rows.find((r) => r.key === key);
    progress[key] = {
      step: row?.step ?? 0,
      dismissed: row?.dismissed ?? false,
      completed: !!row?.completedAt,
    };
  }
  return ok({ progress });
});

const UpdateSchema = z.object({
  key: z.enum(KEYS),
  step: z.number().int().min(0).max(10).optional(),
  dismissed: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const body = UpdateSchema.parse(await req.json());

  const row = await prisma.tutorialProgress.upsert({
    where: { userId_key: { userId: user.id, key: body.key } },
    create: {
      userId: user.id,
      key: body.key,
      step: body.step ?? 0,
      dismissed: body.dismissed ?? false,
      completedAt: body.completed ? new Date() : null,
    },
    update: {
      ...(body.step !== undefined ? { step: body.step } : {}),
      ...(body.dismissed !== undefined ? { dismissed: body.dismissed } : {}),
      ...(body.completed !== undefined
        ? { completedAt: body.completed ? new Date() : null }
        : {}),
    },
  });
  return ok({ progress: row });
});
