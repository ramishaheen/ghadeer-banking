"use client";

import { Icon } from "@/components/Icon";
import { Orb } from "@/components/rafiq/Orb";

export type SmartTipBannerProps = {
  /** Real 24h movement, e.g. "up 1.2%", "down 0.4%" or "steady". */
  trend: string;
  /** Primary action — analyze the 5g bar trend. */
  onAnalyze: () => void;
  /** X dismiss — persists GOLD_SMART_TIP dismissal. */
  onDismiss: () => void;
};

/**
 * AI Smart Tip banner — ported from design 07. Floats above the bottom nav
 * (z-40, below nav's z-50) without blocking the product grid.
 */
export function SmartTipBanner({ trend, onAnalyze, onDismiss }: SmartTipBannerProps) {
  return (
    <div className="fixed bottom-20 inset-x-0 z-40 mx-auto max-w-[420px] px-container-margin fade-up">
      <div className="bg-surface-container-high rounded-xl p-3 shadow-lg border border-outline-variant flex flex-col gap-3 relative">
        <button
          type="button"
          aria-label="Dismiss tip"
          onClick={onDismiss}
          className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest active:scale-95 transition-transform"
        >
          <Icon name="close" style={{ fontSize: 18 }} />
        </button>
        <div className="flex items-start gap-3 pr-9">
          <Orb size={48} className="shrink-0" />
          <p className="flex-1 text-body-md font-body-md text-on-surface-variant font-medium">
            Pro Tip: Gold prices are currently {trend}. Most users start with 5g bars for a balanced
            portfolio.
          </p>
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          className="w-full min-h-11 bg-primary text-on-primary py-2 px-4 rounded-lg font-label-sm text-label-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          Analyze Trend
        </button>
      </div>
    </div>
  );
}
