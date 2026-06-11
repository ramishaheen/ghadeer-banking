import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const alerts = await prisma.priceAlert.findMany({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { sku: true, weightGrams: true } } },
  });
  return ok({ alerts });
});

const AlertSchema = z.object({
  productId: z.string().optional(),
  thresholdMils: z.number().int().positive(),
  direction: z.enum(["ABOVE", "BELOW"]),
});

export const POST = withApi(async (req) => {
  const user = await requireSessionUser();
  const body = AlertSchema.parse(await req.json());
  const alert = await prisma.priceAlert.create({
    data: { userId: user.id, ...body },
  });
  return ok({ alert }, { status: 201 });
});
