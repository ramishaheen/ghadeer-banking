import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { type: "asc" },
  });
  return ok({ accounts });
});
