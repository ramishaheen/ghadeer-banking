import { prisma } from "@/lib/db";

// Live gold spot price per gram in JOD mils. A new tick is generated at most
// once every 60 seconds (matching the "Live price, updated every 60 seconds"
// behaviour in the design); ticks persist so price history charts are real.

const TICK_INTERVAL_MS = 60_000;
const BASE_PRICE_PER_GRAM_MILS = 107_900; // JOD 107.900 / g — calibrated so 5g ≈ JOD 564.727 incl. premium

export async function getCurrentGoldPrice(): Promise<{ pricePerGramMils: number; at: Date }> {
  const latest = await prisma.goldPriceTick.findFirst({ orderBy: { at: "desc" } });

  if (latest && Date.now() - latest.at.getTime() < TICK_INTERVAL_MS) {
    return { pricePerGramMils: latest.pricePerGramMils, at: latest.at };
  }

  const prev = latest?.pricePerGramMils ?? BASE_PRICE_PER_GRAM_MILS;
  // Random walk capped at ±0.25% per tick, mean-reverting toward base.
  const drift = (BASE_PRICE_PER_GRAM_MILS - prev) * 0.05;
  const noise = prev * (Math.random() - 0.5) * 0.005;
  const next = Math.max(1, Math.round(prev + drift + noise));

  const tick = await prisma.goldPriceTick.create({ data: { pricePerGramMils: next } });
  return { pricePerGramMils: tick.pricePerGramMils, at: tick.at };
}

export function unitPriceMils(pricePerGramMils: number, weightGrams: number, premiumPct: number): number {
  return Math.round(pricePerGramMils * weightGrams * (1 + premiumPct));
}

export async function getPriceHistory(hours = 24) {
  const since = new Date(Date.now() - hours * 3600_000);
  return prisma.goldPriceTick.findMany({
    where: { at: { gte: since } },
    orderBy: { at: "asc" },
    take: 500,
  });
}

export async function nextOrderNo(): Promise<string> {
  const count = await prisma.goldOrder.count();
  return `#${99281 + count}`;
}
