import { prisma } from "@/lib/db";
import { withApi, ok } from "@/lib/http";
import { getCurrentGoldPrice, unitPriceMils } from "@/lib/gold";

export const GET = withApi(async () => {
  const [products, { pricePerGramMils, at }] = await Promise.all([
    prisma.goldProduct.findMany({ orderBy: { weightGrams: "asc" } }),
    getCurrentGoldPrice(),
  ]);
  return ok({
    pricePerGramMils,
    priceAt: at,
    products: products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      brand: p.brand,
      purity: p.purity,
      weightGrams: p.weightGrams,
      imageUrl: p.imageUrl,
      inStock: p.stockQty > 0,
      stockQty: p.stockQty,
      priceMils: unitPriceMils(pricePerGramMils, p.weightGrams, p.premiumPct),
    })),
  });
});
