"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/Icon";
import { Orb } from "@/components/rafiq/Orb";
import { api, type GoldOrder, type GoldProduct } from "@/lib/client";
import { fmtJod } from "@/lib/format";

export type OrderSuccessProps = {
  /** The order returned by POST /api/gold/orders (201). */
  order: GoldOrder;
  /** Product purchased — supplies the price-alert threshold (current priceMils). */
  product: GoldProduct;
  /** "Track in My Orders" — close the sheet and show the My orders tab. */
  onTrackOrders: () => void;
  /** "No thanks" quick reply — close the sheet. */
  onClose: () => void;
  /** "Show me other investments" quick reply — go to the Hub. */
  onExploreInvestments: () => void;
};

const chipClass =
  "min-h-11 px-4 py-2 bg-surface-container-highest text-on-surface rounded-full font-label-sm text-label-sm font-semibold border border-outline-variant hover:bg-secondary-container transition-all active:scale-95 disabled:opacity-60";

/** Order success view — ported from design 19, rendered inside the purchase sheet. */
export function OrderSuccess({
  order,
  product,
  onTrackOrders,
  onClose,
  onExploreInvestments,
}: OrderSuccessProps) {
  const [alertState, setAlertState] = useState<"idle" | "saving" | "set">("idle");
  const [alertError, setAlertError] = useState<string | null>(null);

  const setAlert = async () => {
    if (alertState !== "idle") return;
    setAlertState("saving");
    setAlertError(null);
    try {
      await api("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          thresholdMils: product.priceMils,
          direction: "BELOW",
        }),
      });
      setAlertState("set");
    } catch (e) {
      setAlertState("idle");
      setAlertError(e instanceof Error ? e.message : "Could not set the alert. Try again.");
    }
  };

  const fulfillmentLabel = order.fulfillment === "VAULT" ? "Stored in vault" : "Home delivery";

  return (
    <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center fade-up">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <Icon
          name="check_circle"
          className="text-green-600"
          style={{ fontSize: 56, fontVariationSettings: "'FILL' 0, 'wght' 700, 'GRAD' 0, 'opsz' 48" }}
        />
      </div>

      <h2 className="font-display-lg-mobile text-display-lg-mobile text-on-surface">Order placed</h2>
      <p className="font-body-lg text-body-lg text-on-surface-variant mt-1 mb-6">Order {order.orderNo}</p>

      {/* Transaction detail card */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-element-padding shadow-sm border border-outline-variant/30">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src={order.product.imageUrl}
                alt={`${order.product.weightGrams}g ${order.product.name}`}
                width={80}
                height={60}
                unoptimized
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="text-left min-w-0">
              <p className="font-headline-md text-headline-md-mobile text-on-surface truncate">
                {order.product.weightGrams}g {order.product.brand} Gold Bar
              </p>
              <p className="text-label-sm font-label-sm text-on-surface-variant">
                × {order.qty} · {fulfillmentLabel}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-headline-md text-headline-md-mobile text-primary">{fmtJod(order.totalMils)}</p>
            <p className="text-label-sm font-label-sm text-on-surface-variant">
              {order.fulfillment === "VAULT" ? "In vault" : "Processing"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onTrackOrders}
          className="w-full min-h-11 py-3 rounded-full border border-outline text-on-surface font-body-lg text-body-lg hover:bg-surface-container transition-colors active:scale-95"
        >
          Track in My Orders
        </button>
      </div>

      {/* Rafiq follow-up + quick reply chips */}
      <div className="w-full mt-6 flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <Orb size={36} pulse={false} />
          <div className="flex-1 bg-inverse-surface text-inverse-on-surface p-4 rounded-2xl rounded-bl-none shadow-lg text-left">
            <p className="font-body-md text-body-md">
              I have added a reminder to check gold prices weekly. Want me to set a price alert?
            </p>
          </div>
        </div>

        <div data-tut="success-chips" className="flex flex-wrap justify-end gap-2">
          {alertState === "set" ? (
            <p className="font-label-sm text-label-sm font-bold text-primary flex items-center gap-1.5 py-2.5">
              <Icon name="notifications_active" filled style={{ fontSize: 16 }} />
              Alert set — you will be notified below {fmtJod(product.priceMils)}.
            </p>
          ) : (
            <>
              <button type="button" onClick={setAlert} disabled={alertState === "saving"} className={chipClass}>
                {alertState === "saving" ? "Setting alert…" : "Yes, set alert"}
              </button>
              <button type="button" onClick={onClose} className={chipClass}>
                No thanks
              </button>
              <button type="button" onClick={onExploreInvestments} className={chipClass}>
                Show me other investments
              </button>
            </>
          )}
        </div>
        {alertError && (
          <p className="text-error font-label-sm text-label-sm text-right" role="alert">
            {alertError}
          </p>
        )}
      </div>
    </div>
  );
}
