import { requireSessionUser } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { computeInsights } from "@/lib/insights";

export const GET = withApi(async () => {
  const user = await requireSessionUser();
  const insights = await computeInsights(user.id);
  return ok({ insights });
});
