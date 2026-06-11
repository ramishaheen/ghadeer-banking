import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/session";
import { withApi, ok } from "@/lib/http";
import { getCurrentGoldPrice, getPriceHistory, unitPriceMils } from "@/lib/gold";

export const GET = withApi(async (_req, ctx) => {
  const { sku } = await ctx.params;
  const product = await prisma.goldProduct.findUnique({ where: { sku } });
  if (!product) throw new ApiError(404, "Product not found.");

  const [{ pricePerGramMils, at }, history] = await Promise.all([
    getCurrentGoldPrice(),
    getPriceHistory(24),
  ]);

  return ok({
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      purity: product.purity,
      weightGrams: product.weightGrams,
      imageUrl: product.imageUrl,
      inStock: product.stockQty > 0,
      stockQty: product.stockQty,
      premiumPct: product.premiumPct,
      priceMils: unitPriceMils(pricePerGramMils, product.weightGrams, product.premiumPct),
    },
    pricePerGramMils,
    priceAt: at,
    history: history.map((h) => ({
      p: unitPriceMils(h.pricePerGramMils, product.weightGrams, product.premiumPct),
      t: h.at,
    })),
  });
});
