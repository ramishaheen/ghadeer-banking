"use client";

import { Icon } from "@/components/Icon";
import { Orb } from "@/components/rafiq/Orb";

/**
 * AI investment guide tooltip (design 26): white card with a soft orange
 * border anchored under the Investment section header, with the orb avatar,
 * a dismiss X and a primary chip leading to the gold marketplace.
 */
export function InvestGuideTooltip({
  onDismiss,
  onSee,
}: {
  onDismiss: () => void;
  onSee: () => void;
}) {
  return (
    <div className="relative mb-5 fade-up" role="note">
      {/* Arrow pointing up at the Investment section header */}
      <div
        className="absolute -top-1.5 left-8 w-4 h-4 bg-surface-container-lowest border-t-2 border-l-2 border-primary/20 rotate-45"
        aria-hidden
      />
      <div className="relative bg-surface-container-lowest border-2 border-primary/20 rounded-2xl p-4 shadow-xl">
        <button
          aria-label="Dismiss investment tip"
          onClick={onDismiss}
          className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center rounded-full text-outline hover:text-primary transition-colors active:scale-95"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
        <div className="flex gap-3">
          <Orb size={40} pulse={false} className="mt-0.5" />
          <div className="flex-1 pr-7">
            <p className="font-body-md text-body-md text-on-surface leading-snug">
              {"Gold is a popular choice for long-term stability. Would you like to see how it's performing today?"}
            </p>
            <button
              onClick={onSee}
              className="mt-3 px-4 py-2 bg-primary text-on-primary rounded-full font-bold text-label-sm active:scale-95 transition-transform"
            >
              {"See how it's performing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
