"use client";

import { Icon } from "@/components/Icon";
import { EmptyState, Skeleton } from "@/components/States";
import { useApi } from "@/lib/client";
import type { Txn } from "@/lib/client";
import { fmtDate, fmtJod } from "@/lib/format";

const CATEGORY_ICONS: Record<string, string> = {
  Groceries: "shopping_cart",
  Dining: "restaurant",
  Subscriptions: "subscriptions",
  Utilities: "bolt",
  Bills: "receipt_long",
  Salary: "payments",
  Cashback: "redeem",
  CashbackWithdraw: "redeem",
  Transfer: "swap_horiz",
  Gold: "workspace_premium",
  Electronics: "shopping_bag",
};

/**
 * Recent activity — last 4 transactions (transaction list idiom from the
 * coaching screen, design 21): icon circle + merchant + category, signed
 * amount with CREDIT in primary.
 */
export function RecentActivity() {
  const { data, error, loading, reload } = useApi<{ transactions: Txn[] }>(
    "/api/transactions?limit=4"
  );

  return (
    <section className="space-y-4">
      <h2 className="font-headline-md text-headline-md-mobile text-on-surface">Recent activity</h2>

      {loading && !data && (
        <div className="space-y-card-gap">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </div>
      )}

      {error && !data && (
        <div
          className="bg-surface-container-lowest rounded-xl border border-surface-container p-element-padding flex flex-col items-center text-center gap-2"
          role="alert"
        >
          <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
            <Icon name="error" className="text-on-error-container text-[20px]" />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">{error}</p>
          <button
            onClick={() => void reload()}
            className="mt-1 px-5 py-2.5 bg-primary text-on-primary font-bold rounded-full text-label-sm active:scale-95 transition-transform"
          >
            Try again
          </button>
        </div>
      )}

      {data && data.transactions.length === 0 && (
        <EmptyState
          icon="receipt_long"
          title="No transactions yet"
          body="Your latest account activity will show up here."
        />
      )}

      {data && data.transactions.length > 0 && (
        <div className="space-y-card-gap">
          {data.transactions.map((t) => {
            const credit = t.type === "CREDIT";
            return (
              <div
                key={t.id}
                className="bg-surface-container-lowest rounded-xl p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04)] border border-surface-container flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
                    <Icon
                      name={CATEGORY_ICONS[t.category] ?? "receipt_long"}
                      className="text-on-surface-variant"
                    />
                  </div>
                  <div>
                    <p className="font-body-lg text-body-lg text-on-surface">{t.merchant}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {t.category} • {fmtDate(t.createdAt)}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-body-lg text-body-lg font-bold ${
                    credit ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {credit ? "+" : "-"}
                  {fmtJod(t.amountMils)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
