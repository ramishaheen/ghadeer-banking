"use client";

import { Icon } from "@/components/Icon";
import { fmtJod } from "@/lib/format";

/**
 * Total Balance card — ported from the Accounts Overview reference (design 28):
 * balance-gradient, SVG circle texture overlay, masked balance with visibility
 * toggle, Money in / Money out from the monthly summary, and the white
 * "Show balance" pill that drives the same reveal.
 */
export function BalanceCard({
  totalMils,
  shown,
  onToggle,
  inMils,
  outMils,
  summaryLoading,
  summaryError,
  onRetrySummary,
}: {
  totalMils: number;
  shown: boolean;
  onToggle: () => void;
  inMils: number | null;
  outMils: number | null;
  summaryLoading: boolean;
  summaryError: string | null;
  onRetrySummary: () => void;
}) {
  const flow = (mils: number | null) => {
    if (mils !== null) {
      return <p className="font-headline-md text-headline-md-mobile">{fmtJod(mils)}</p>;
    }
    if (summaryLoading) {
      return <div className="h-7 w-28 rounded-lg bg-white/20 animate-pulse" aria-hidden />;
    }
    return <p className="font-headline-md text-headline-md-mobile opacity-70">—</p>;
  };

  return (
    <section className="mt-4">
      <div className="balance-gradient rounded-xl p-element-padding shadow-sm text-on-primary relative overflow-hidden active:scale-[0.98] transition-all duration-200">
        {/* Abstract Texture Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%" aria-hidden>
            <circle cx="90" cy="10" fill="white" r="40" />
            <circle cx="10" cy="90" fill="white" r="30" />
          </svg>
        </div>
        <div className="relative z-10">
          <p className="font-label-sm text-label-sm opacity-90 mb-1">Total balance</p>
          <div className="flex items-baseline gap-2 mb-4">
            <h1 className="font-display-lg text-display-lg tracking-tight">
              {shown ? fmtJod(totalMils) : "JOD ••••"}
            </h1>
            <button
              aria-label={shown ? "Hide balance" : "Show balance"}
              onClick={onToggle}
              className="w-11 h-11 -my-3 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-transform"
            >
              <Icon name={shown ? "visibility" : "visibility_off"} className="text-[18px]" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/20">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 opacity-80">
                <Icon name="south_west" className="text-[14px]" />
                <span className="font-label-sm text-label-sm">Money in</span>
              </div>
              {flow(inMils)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 opacity-80">
                <Icon name="north_east" className="text-[14px]" />
                <span className="font-label-sm text-label-sm">Money out</span>
              </div>
              {flow(outMils)}
            </div>
          </div>
          {summaryError && inMils === null && (
            <button
              onClick={onRetrySummary}
              className="mt-3 font-label-sm text-label-sm underline underline-offset-2 text-white/90 active:scale-95 transition-transform"
            >
              {"Couldn't load this month's flow — tap to retry"}
            </button>
          )}
          <button
            onClick={onToggle}
            className="mt-6 w-full py-3 bg-white text-primary font-bold rounded-full text-body-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {shown ? "Hide balance" : "Show balance"}
          </button>
        </div>
      </div>
    </section>
  );
}
