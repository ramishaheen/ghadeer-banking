import { withApi, ok } from "@/lib/http";
import { getCurrentGoldPrice, getPriceHistory } from "@/lib/gold";

export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const withHistory = url.searchParams.get("history") === "1";
  const { pricePerGramMils, at } = await getCurrentGoldPrice();
  const history = withHistory ? await getPriceHistory(24) : undefined;
  return ok({
    pricePerGramMils,
    at,
    ...(history
      ? { history: history.map((h) => ({ p: h.pricePerGramMils, t: h.at })) }
      : {}),
  });
});
