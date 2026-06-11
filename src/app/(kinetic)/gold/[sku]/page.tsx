"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ErrorState, ScreenSkeleton } from "@/components/States";
import { PriceChart } from "@/components/gold/PriceChart";
import { PurchaseSheet } from "@/components/gold/PurchaseSheet";
import { useApi, type GoldProduct, type Me } from "@/lib/client";
import { fmtJod } from "@/lib/format";

type DetailPayload = {
  product: GoldProduct & { premiumPct: number };
  pricePerGramMils: number;
  priceAt: string;
  history: { p: number; t: string }[];
};

const TRUST_CHIPS = [
  { icon: "verified_user", label: "Insured Storage" },
  { icon: "local_shipping", label: "Secure Delivery" },
  { icon: "sell", label: "Instant Liquidity" },
] as const;

export default function GoldProductDetailPage() {
  const router = useRouter();
  const { sku } = useParams<{ sku: string }>();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Live price — refetch every 60s like the shop's price strip.
  const detail = useApi<DetailPayload>(sku ? `/api/gold/products/${sku}` : null, {
    refreshMs: 60_000,
  });
  const me = useApi<Me>("/api/me");

  // 24h change % from the per-unit history.
  const change = useMemo(() => {
    const h = detail.data?.history;
    if (!h || h.length < 2) return null;
    return ((h[h.length - 1].p - h[0].p) / h[0].p) * 100;
  }, [detail.data]);

  const product = detail.data?.product ?? null;

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-dvh">
      {/* TopAppBar — design 10 */}
      <header className="fixed top-0 inset-x-0 mx-auto max-w-[420px] z-50 bg-surface flex justify-between items-center px-container-margin py-3">
        <Link
          href="/gold"
          aria-label="Back to gold shop"
          className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-high transition-colors rounded-full active:scale-95 duration-150"
        >
          <Icon name="arrow_back" className="text-primary" />
        </Link>
        <h1 className="font-headline-md text-headline-md-mobile text-primary">
          Rafiq<span className="text-primary-container">+</span>
        </h1>
        <button
          type="button"
          aria-label="Notifications"
          className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-high transition-colors rounded-full active:scale-95 duration-150"
        >
          <Icon name="notifications" className="text-primary" />
        </button>
      </header>

      {!product && detail.loading ? (
        <ScreenSkeleton />
      ) : !product ? (
        <main className="pt-16">
          <ErrorState
            message={detail.error ?? "Product not found."}
            onRetry={() => void detail.reload()}
          />
          <div className="flex justify-center pb-10">
            <Link
              href="/gold"
              className="font-label-sm text-label-sm font-bold text-primary underline underline-offset-4 active:scale-95 transition-transform"
            >
              Back to Physical Gold
            </Link>
          </div>
        </main>
      ) : (
        <>
          <main className="pt-16 pb-36">
            {/* Hero product view */}
            <section className="px-container-margin py-6">
              <div className="relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm flex flex-col items-center p-8 border border-surface-container-highest">
                <div className="absolute top-4 left-4 bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-label-sm font-label-sm">
                  {product.purity} Fine Gold
                </div>
                <div className="w-full aspect-square flex items-center justify-center relative mb-6">
                  <Image
                    src={product.imageUrl}
                    alt={`${product.weightGrams}g ${product.name}`}
                    width={320}
                    height={240}
                    unoptimized
                    priority
                    className="h-64 w-auto object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="text-center">
                  <h2 className="font-headline-md text-headline-md-mobile text-on-surface mb-1">
                    {product.weightGrams}g {product.name}
                  </h2>
                  <p className="text-on-surface-variant font-body-md text-body-md">
                    Refined by {product.brand} • LBMA Certified
                  </p>
                </div>
              </div>
            </section>

            {/* Key specifications bento grid */}
            <section className="px-container-margin grid grid-cols-2 gap-card-gap">
              <div className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-surface-container-highest">
                <Icon name="weight" className="text-primary mb-2" />
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                  Weight
                </p>
                <p className="font-headline-md text-headline-md-mobile text-on-surface">
                  {product.weightGrams.toFixed(2)} Grams
                </p>
              </div>
              <div className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-surface-container-highest">
                <Icon name="workspace_premium" className="text-primary mb-2" />
                <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                  Purity
                </p>
                <p className="font-headline-md text-headline-md-mobile text-on-surface">{product.purity} Fine</p>
              </div>
              <div className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-surface-container-highest col-span-2 flex justify-between items-center">
                <div>
                  <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                    Brand
                  </p>
                  <p className="font-body-lg text-body-lg text-on-surface">{product.brand}</p>
                </div>
                <div className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-3 py-2 rounded-full">
                  <Icon name="verified" className="text-primary" style={{ fontSize: 18 }} />
                  <span className="font-label-sm text-label-sm">LBMA certified</span>
                </div>
              </div>
            </section>

            {/* Price trend card */}
            <section className="px-container-margin mt-card-gap">
              <div className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-surface-container-highest">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">
                      Current Price
                    </p>
                    <p className="font-display-lg text-display-lg-mobile text-on-surface">
                      {fmtJod(product.priceMils)}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                      per bar · live, updated every 60s
                    </p>
                  </div>
                  {change !== null && (
                    <div
                      className={`px-2 py-1 rounded-lg text-label-sm font-label-sm flex items-center gap-1 mb-1 ${
                        change >= 0
                          ? "bg-primary-fixed/60 text-primary"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      <Icon name={change >= 0 ? "trending_up" : "trending_down"} style={{ fontSize: 14 }} />
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(1)}%
                    </div>
                  )}
                </div>
                <PriceChart history={detail.data?.history ?? []} height={96} />
                {/* Stock state */}
                <div
                  className={`mt-4 rounded-xl px-3 py-2.5 flex items-center gap-2 ${
                    product.inStock
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  <Icon
                    name={product.inStock ? "inventory_2" : "production_quantity_limits"}
                    className={product.inStock ? "text-primary" : undefined}
                    style={{ fontSize: 18 }}
                  />
                  <span className="font-label-sm text-label-sm font-bold uppercase tracking-wide">
                    {product.inStock ? `In stock · ${product.stockQty} available` : "Out of stock"}
                  </span>
                </div>
              </div>
            </section>

            {/* Security & delivery chips */}
            <section className="px-container-margin mt-card-gap flex gap-2 overflow-x-auto hide-scrollbar">
              {TRUST_CHIPS.map((c) => (
                <div
                  key={c.label}
                  className="flex-shrink-0 bg-secondary-container text-on-secondary-container px-4 py-3 rounded-xl flex items-center gap-2"
                >
                  <Icon name={c.icon} className="text-primary" />
                  <span className="font-label-sm text-label-sm">{c.label}</span>
                </div>
              ))}
            </section>

            {/* Description */}
            <section className="px-container-margin mt-8">
              <div className="flex border-b border-surface-container-highest mb-4">
                <span className="px-4 py-2 border-b-2 border-primary text-primary font-body-lg text-body-lg">
                  Description
                </span>
              </div>
              <p className="text-on-surface-variant leading-relaxed">
                The {product.weightGrams}g {product.brand} Gold Bar is one of the most recognizable and
                coveted products in the precious metals market. Featuring the iconic Lady Fortuna, the
                Roman goddess of prosperity, this minted bar is produced by the world-renowned PAMP
                refinery in Switzerland.
              </p>
            </section>
          </main>

          {/* Sticky bottom buy section — design 10 */}
          <footer className="fixed bottom-0 inset-x-0 mx-auto max-w-[420px] z-50 bg-surface-container-lowest p-container-margin shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)] rounded-t-xl border-t border-surface-container pb-safe">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-label-sm font-label-sm text-on-surface-variant">Total Price</p>
                <p className="font-headline-md text-headline-md-mobile text-on-surface">
                  {fmtJod(product.priceMils)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                disabled={!product.inStock}
                className="flex-[2] bg-primary-container text-on-primary-container py-4 rounded-full font-headline-md text-headline-md-mobile flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                {product.inStock ? "Buy Now" : "Out of stock"}
                {product.inStock && <Icon name="payments" />}
              </button>
            </div>
          </footer>

          {/* Floating contextual support — design 10 (opens Rafiq) */}
          <div className="fixed bottom-28 inset-x-0 mx-auto max-w-[420px] z-40 flex justify-end pr-4 pointer-events-none">
            <button
              type="button"
              aria-label="Ask Rafiq for help"
              onClick={() => router.push("/rafiq")}
              className="pointer-events-auto w-12 h-12 bg-primary rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <Icon name="support_agent" filled />
            </button>
          </div>

          <PurchaseSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            product={product}
            accounts={me.data?.accounts ?? []}
            onOrderPlaced={() => {
              void detail.reload(true);
              void me.reload(true);
            }}
            onViewOrders={() => router.push("/gold?tab=orders")}
          />
        </>
      )}
    </div>
  );
}
