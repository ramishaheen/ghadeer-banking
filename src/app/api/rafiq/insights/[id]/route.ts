import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

const PatchSchema = z.object({
  status: z.enum(["SEEN", "ACTED", "DISMISSED"]),
});

export const PATCH = withApi(async (req, ctx) => {
  const user = await requireSessionUser();
  const { id } = await ctx.params;
  const { status } = PatchSchema.parse(await req.json());

  const insight = await prisma.insight.findFirst({ where: { id, userId: user.id } });
  if (!insight) throw new ApiError(404, "Insight not found.");

  const updated = await prisma.insight.update({ where: { id }, data: { status } });
  return ok({ insight: updated });
});
