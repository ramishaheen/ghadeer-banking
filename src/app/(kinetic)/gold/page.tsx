"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { EmptyState, ErrorState, ScreenSkeleton, Skeleton } from "@/components/States";
import { BottomNav } from "@/components/kinetic/BottomNav";
import { ProductCard } from "@/components/gold/ProductCard";
import { PurchaseSheet } from "@/components/gold/PurchaseSheet";
import { SmartTipBanner } from "@/components/gold/SmartTipBanner";
import { GoldTutorialController } from "@/components/tutorial/GoldTutorialController";
import {
  api,
  useApi,
  type GoldOrder,
  type GoldProduct,
  type Me,
  type TutorialState,
} from "@/lib/client";
import { fmtDate, fmtJod } from "@/lib/format";

type ProductsPayload = { pricePerGramMils: number; priceAt: string; products: GoldProduct[] };
type OrdersPayload = { orders: GoldOrder[] };
type PricePayload = { pricePerGramMils: number; at: string; history: { p: number; t: string }[] };
type TutorialsPayload = { progress: TutorialState };

type Tab = "explore" | "orders";

function fulfillmentLabel(order: GoldOrder): string {
  if (order.fulfillment === "VAULT") return "In vault";
  if (order.status === "PROCESSING") return "Processing";
  return order.status.charAt(0) + order.status.slice(1).toLowerCase().replace(/_/g, " ");
}

function GoldShop() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab: Tab = searchParams.get("tab") === "orders" ? "orders" : "explore";

  const [tab, setTab] = useState<Tab>(urlTab);
  const [sheetProduct, setSheetProduct] = useState<GoldProduct | null>(null);
  const [tipHidden, setTipHidden] = useState(false);

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  // Live data — products refresh every 60s to match the "Live" price strip.
  const products = useApi<ProductsPayload>("/api/gold/products", { refreshMs: 60_000 });
  const orders = useApi<OrdersPayload>("/api/gold/orders");
  const me = useApi<Me>("/api/me");
  const price = useApi<PricePayload>("/api/gold/price?history=1");
  const tutorials = useApi<TutorialsPayload>("/api/tutorials");

  // Real 24h movement for the Smart Tip ("up 1.2%" / "down 0.4%" / "steady").
  const trend = useMemo(() => {
    const h = price.data?.history;
    if (!h || h.length < 2) return null;
    const pct = ((h[h.length - 1].p - h[0].p) / h[0].p) * 100;
    if (Math.abs(pct) < 0.05) return "steady";
    return `${pct > 0 ? "up" : "down"} ${Math.abs(pct).toFixed(1)}%`;
  }, [price.data]);

  const showTip =
    !tipHidden &&
    trend !== null &&
    tutorials.data?.progress.GOLD_SMART_TIP.dismissed === false;

  const dismissTip = async () => {
    setTipHidden(true);
    try {
      await api("/api/tutorials", {
        method: "POST",
        body: JSON.stringify({ key: "GOLD_SMART_TIP", dismissed: true }),
      });
    } catch {
      // Banner stays hidden for this session; it will reappear next visit if the save failed.
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    router.replace(next === "orders" ? "/gold?tab=orders" : "/gold", { scroll: false });
  };

  const handleOrderPlaced = () => {
    // Stock, order list and account balances all changed server-side.
    void products.reload(true);
    void orders.reload(true);
    void me.reload(true);
  };

  const showOrdersTab = () => {
    setSheetProduct(null);
    switchTab("orders");
  };

  const segment = (key: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => switchTab(key)}
      className={`flex-1 min-h-11 py-2 text-label-sm font-label-sm rounded-lg transition-all ${
        tab === key
          ? "bg-surface-container-lowest text-primary shadow-[0_2px_4px_rgba(0,0,0,0.05)]"
          : "text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-dvh">
      {/* Top AppBar — design 08 */}
      <header className="fixed top-0 inset-x-0 mx-auto max-w-[420px] z-50 bg-surface flex justify-between items-center px-container-margin py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/hub"
            aria-label="Back to hub"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high active:scale-95 transition-all"
          >
            <Icon name="arrow_back" className="text-primary" />
          </Link>
          <h1 className="font-headline-md text-headline-md-mobile text-primary">Physical Gold</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high active:scale-95 transition-all"
          >
            <Icon name="notifications" className="text-on-surface-variant" />
          </button>
          <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center overflow-hidden border border-outline-variant">
            <span className="font-label-sm text-label-sm font-bold text-on-secondary-fixed">
              {me.data?.user.name.slice(0, 1) ?? ""}
            </span>
          </div>
        </div>
      </header>

      <main className={`pt-20 px-container-margin ${showTip ? "pb-60" : "pb-24"}`}>
        {/* Segmented control */}
        <div className="bg-surface-container flex p-1 rounded-xl mb-4" role="tablist" aria-label="Gold shop sections">
          {segment("explore", "Explore")}
          {segment("orders", "My orders")}
        </div>

        {/* Live price strip */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2 h-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-primary-container" />
            </span>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Live · updated every 60s</p>
          </div>
          {products.data ? (
            <p className="font-label-sm text-label-sm font-bold text-on-surface">
              {fmtJod(products.data.pricePerGramMils)} / g
            </p>
          ) : (
            <Skeleton className="h-4 w-28" />
          )}
        </div>

        {tab === "explore" ? (
          <section role="tabpanel" aria-label="Explore">
            {products.data ? (
              products.data.products.length === 0 ? (
                <EmptyState
                  icon="storefront"
                  title="No bars available"
                  body="Check back soon — new stock is on the way."
                />
              ) : (
                <div className="grid grid-cols-2 gap-card-gap">
                  {products.data.products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onAdd={setSheetProduct}
                      tutorialAnchor={p.sku === "PAMP-5G"}
                    />
                  ))}
                </div>
              )
            ) : products.loading ? (
              <div className="grid grid-cols-2 gap-card-gap">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : (
              <ErrorState
                message={products.error ?? "Could not load products."}
                onRetry={() => void products.reload()}
              />
            )}
          </section>
        ) : (
          <section role="tabpanel" aria-label="My orders">
            {orders.data ? (
              orders.data.orders.length === 0 ? (
                <EmptyState
                  icon="package_2"
                  title="No orders yet"
                  body="Your gold purchases will appear here."
                  action={{ label: "Explore bars", onClick: () => switchTab("explore") }}
                />
              ) : (
                <ul className="space-y-card-gap">
                  {orders.data.orders.map((o) => (
                    <li
                      key={o.id}
                      className="bg-surface-container-lowest rounded-xl p-3 border border-surface-container shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex items-center gap-3"
                    >
                      <div className="w-14 h-14 rounded-lg bg-surface-container-low overflow-hidden flex items-center justify-center shrink-0">
                        <Image
                          src={o.product.imageUrl}
                          alt={`${o.product.weightGrams}g ${o.product.name}`}
                          width={112}
                          height={84}
                          unoptimized
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-md text-body-md font-bold text-on-background leading-tight truncate">
                          {o.product.weightGrams}g {o.product.name} × {o.qty}
                        </p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                          {o.orderNo} · {fmtDate(o.createdAt)}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            o.fulfillment === "VAULT"
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-primary-fixed text-on-primary-fixed-variant"
                          }`}
                        >
                          <Icon
                            name={o.fulfillment === "VAULT" ? "lock" : "local_shipping"}
                            style={{ fontSize: 12 }}
                          />
                          {fulfillmentLabel(o)}
                        </span>
                      </div>
                      <p className="font-body-lg text-body-lg text-on-surface shrink-0">{fmtJod(o.totalMils)}</p>
                    </li>
                  ))}
                </ul>
              )
            ) : orders.loading ? (
              <div className="space-y-card-gap">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <ErrorState
                message={orders.error ?? "Could not load orders."}
                onRetry={() => void orders.reload()}
              />
            )}
          </section>
        )}
      </main>

      {/* AI Smart Tip — design 07 (floats above the bottom area, never over the nav) */}
      {showTip && trend && (
        <SmartTipBanner
          trend={trend}
          onAnalyze={() => router.push("/gold/PAMP-5G")}
          onDismiss={() => void dismissTip()}
        />
      )}

      <PurchaseSheet
        open={!!sheetProduct}
        onClose={() => setSheetProduct(null)}
        product={sheetProduct}
        accounts={me.data?.accounts ?? []}
        onOrderPlaced={handleOrderPlaced}
        onViewOrders={showOrdersTab}
      />

      <GoldTutorialController page="gold" />
      <BottomNav />
    </div>
  );
}

export default function GoldShopPage() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <GoldShop />
    </Suspense>
  );
}
