"use client";

import { useId } from "react";
import { fmtJod } from "@/lib/format";

export type PricePoint = { p: number; t: string };

export type PriceChartProps = {
  /** 24h per-unit price history (oldest → newest), from /api/gold/products/[sku]. */
  history: PricePoint[];
  /** Plot height in px. */
  height?: number;
};

/**
 * 24h price trend — inline SVG area chart with the design system's
 * orange (#ff6b00 → transparent) gradient fill, min/max labels and axis hints.
 */
export function PriceChart({ history, height = 112 }: PriceChartProps) {
  const gradientId = `gold-area-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (history.length < 2) {
    return (
      <div
        className="w-full rounded-lg bg-surface-container-low flex items-center justify-center"
        style={{ height }}
      >
        <p className="font-label-sm text-label-sm text-on-surface-variant">Collecting live price data…</p>
      </div>
    );
  }

  const W = 320;
  const H = 100;
  const PAD = 6;
  const prices = history.map((h) => h.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;

  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * W;
    const y = PAD + (1 - (h.p - min) / span) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height }}
          role="img"
          aria-label={`24-hour price trend, low ${fmtJod(min)}, high ${fmtJod(max)}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6b00" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="#ff6b00"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Min/max overlay labels */}
        <span className="absolute top-0 left-0 text-[10px] font-bold text-on-surface-variant bg-surface-container-lowest/70 rounded px-1">
          {fmtJod(max)}
        </span>
        <span className="absolute bottom-0 left-0 text-[10px] font-bold text-on-surface-variant bg-surface-container-lowest/70 rounded px-1">
          {fmtJod(min)}
        </span>
      </div>
      <div className="flex justify-between mt-2 font-label-sm text-label-sm text-on-surface-variant">
        <span>24h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}
