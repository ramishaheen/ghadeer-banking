"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { OrderSuccess } from "@/components/gold/OrderSuccess";
import { api, type Account, type GoldOrder, type GoldProduct } from "@/lib/client";
import { fmtJod } from "@/lib/format";

export type Fulfillment = "DELIVERY" | "VAULT";

export type PurchaseSheetProps = {
  /** Controlled open state — pages and the gold tutorial drive this. */
  open: boolean;
  /** Close request (scrim tap, Escape, "No thanks"). */
  onClose: () => void;
  /** Product being purchased; pass null when nothing is selected. */
  product: GoldProduct | null;
  /** Funding accounts from GET /api/me (defaults to the CHECKING account). */
  accounts: Account[];
  /** Fires once with the created order after a successful POST /api/gold/orders. */
  onOrderPlaced?: (order: GoldOrder) => void;
  /** "Track in My Orders" on the success view (falls back to onClose). */
  onViewOrders?: () => void;
};

/**
 * Confirm-purchase bottom sheet (design 12). On a 201 the content swaps to the
 * Order Success view (design 19). State lives in the inner flow component so
 * every open starts fresh.
 */
export function PurchaseSheet({
  open,
  onClose,
  product,
  accounts,
  onOrderPlaced,
  onViewOrders,
}: PurchaseSheetProps) {
  const visible = open && !!product;

  // Lock background scroll while the sheet is up.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible || !product) return null;

  return (
    // Fixed wrapper pins the (absolutely positioned) shared Sheet to the viewport.
    <div className="fixed inset-0 z-[80] mx-auto max-w-[420px]">
      <Sheet open onClose={onClose}>
        <PurchaseFlow
          key={product.id}
          product={product}
          accounts={accounts}
          onClose={onClose}
          onOrderPlaced={onOrderPlaced}
          onViewOrders={onViewOrders}
        />
      </Sheet>
    </div>
  );
}

function PurchaseFlow({
  product,
  accounts,
  onClose,
  onOrderPlaced,
  onViewOrders,
}: {
  product: GoldProduct;
  accounts: Account[];
  onClose: () => void;
  onOrderPlaced?: (order: GoldOrder) => void;
  onViewOrders?: () => void;
}) {
  const router = useRouter();
  const maxQty = Math.max(1, Math.min(product.stockQty, 20));

  const defaultAccountId = useMemo(() => {
    const checking = accounts.find((a) => a.type === "CHECKING");
    return (checking ?? accounts[0])?.id ?? "";
  }, [accounts]);

  const [qty, setQty] = useState(1);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("VAULT");
  const [sourceAccountId, setSourceAccountId] = useState(defaultAccountId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<GoldOrder | null>(null);

  // Accounts can arrive after the sheet opens — adopt the default once loaded.
  useEffect(() => {
    if (!sourceAccountId && defaultAccountId) setSourceAccountId(defaultAccountId);
  }, [sourceAccountId, defaultAccountId]);

  const totalMils = product.priceMils * qty;

  const confirm = async () => {
    if (submitting || !sourceAccountId) return;
    setSubmitting(true);
    setError(null);
    try {
      const { order } = await api<{ order: GoldOrder }>("/api/gold/orders", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, qty, fulfillment, sourceAccountId }),
      });
      setPlacedOrder(order);
      onOrderPlaced?.(order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <OrderSuccess
        order={placedOrder}
        product={product}
        onTrackOrders={onViewOrders ?? onClose}
        onClose={onClose}
        onExploreInvestments={() => router.push("/hub")}
      />
    );
  }

  return (
    <div className="px-6 pb-8 pt-1">
      <h2 className="font-headline-md text-headline-md mb-6 text-center text-on-surface">Confirm Purchase</h2>

      {/* Product summary */}
      <div className="flex gap-4 items-center mb-5">
        <div className="w-16 h-16 bg-surface-container-low rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          <Image
            src={product.imageUrl}
            alt={`${product.weightGrams}g ${product.name}`}
            width={128}
            height={96}
            unoptimized
            className="w-full h-full object-contain p-1"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-body-lg text-body-lg text-on-surface truncate">
            {product.weightGrams}g {product.name}
          </h3>
          <p className="font-label-sm text-label-sm text-primary font-bold">{product.purity} Fine Gold</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-body-lg text-body-lg text-on-surface">{fmtJod(product.priceMils)}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">per bar</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {/* Quantity stepper */}
        <div className="flex justify-between items-center p-3 bg-surface rounded-xl">
          <div className="flex items-center gap-3">
            <Icon name="inventory_2" className="text-primary" />
            <div>
              <p className="font-body-md text-body-md text-on-surface">Quantity</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">{product.stockQty} in stock</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-surface-container-lowest border border-outline-variant text-on-surface active:scale-95 transition-transform disabled:opacity-40"
            >
              <Icon name="remove" style={{ fontSize: 20 }} />
            </button>
            <span className="w-8 text-center font-body-lg text-body-lg font-bold text-on-surface" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={qty >= maxQty}
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-surface-container-lowest border border-outline-variant text-on-surface active:scale-95 transition-transform disabled:opacity-40"
            >
              <Icon name="add" style={{ fontSize: 20 }} />
            </button>
          </div>
        </div>

        {/* Vault / Delivery toggle */}
        <div className="bg-surface-container p-1 rounded-xl flex" role="group" aria-label="Fulfillment">
          <button
            type="button"
            aria-pressed={fulfillment === "VAULT"}
            onClick={() => setFulfillment("VAULT")}
            className={`flex-1 min-h-11 py-2 rounded-lg text-body-md font-body-md transition-all ${
              fulfillment === "VAULT"
                ? "bg-surface-container-lowest font-bold shadow-sm text-on-surface"
                : "text-on-surface-variant"
            }`}
          >
            Store in vault
          </button>
          <button
            type="button"
            aria-pressed={fulfillment === "DELIVERY"}
            onClick={() => setFulfillment("DELIVERY")}
            className={`flex-1 min-h-11 py-2 rounded-lg text-body-md font-body-md transition-all ${
              fulfillment === "DELIVERY"
                ? "bg-surface-container-lowest font-bold shadow-sm text-on-surface"
                : "text-on-surface-variant"
            }`}
          >
            Home delivery
          </button>
        </div>

        {/* Source account */}
        <div role="radiogroup" aria-label="Pay from account" className="space-y-2">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider px-1">
            Pay from
          </p>
          {accounts.length === 0 && (
            <p className="text-error font-label-sm text-label-sm px-1">
              Could not load your accounts. Close the sheet and try again.
            </p>
          )}
          {accounts.map((a) => {
            const selected = a.id === sourceAccountId;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSourceAccountId(a.id)}
                className={`w-full min-h-11 flex items-center gap-3 p-3 rounded-xl border text-left transition-colors active:scale-[0.99] ${
                  selected ? "border-primary bg-primary-fixed/30" : "border-outline-variant/60 bg-surface"
                }`}
              >
                <span
                  aria-hidden
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected ? "border-primary" : "border-outline"
                  }`}
                >
                  {selected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-body-md text-body-md font-bold text-on-surface truncate">
                    {a.name}
                  </span>
                  <span className="block font-label-sm text-label-sm text-on-surface-variant">
                    {a.numberMasked}
                  </span>
                </span>
                <span className="font-body-md text-body-md text-on-surface-variant shrink-0">
                  {fmtJod(a.balanceMils)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center p-3 bg-surface rounded-xl">
          <div className="flex items-center gap-3">
            <Icon name="payments" className="text-primary" />
            <span className="font-body-md text-body-md text-on-surface">Total</span>
          </div>
          <div className="text-right">
            <p className="font-headline-md text-headline-md-mobile text-on-surface">{fmtJod(totalMils)}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {qty} × {fmtJod(product.priceMils)}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-error font-label-sm text-label-sm mb-3" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        data-tut="confirm-purchase"
        onClick={confirm}
        disabled={submitting || !sourceAccountId}
        className="w-full bg-primary-container text-on-primary font-body-lg text-body-lg py-4 rounded-full font-bold shadow-lg active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
      >
        {submitting ? "Confirming…" : "Confirm purchase"}
      </button>
    </div>
  );
}
