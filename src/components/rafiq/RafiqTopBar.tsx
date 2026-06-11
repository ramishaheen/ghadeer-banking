"use client";

import Link from "next/link";
import { Orb } from "@/components/rafiq/Orb";

/**
 * Rafiq top app bar: swirl logo, "RAFIQ" in bold serif + "رفيق" in orange,
 * with a status indicator — per the Rafiq companion design.
 */
export function RafiqTopBar({
  back,
  status = "Online",
  right,
}: {
  back?: string;
  status?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 flex items-center justify-between px-container-padding py-3">
      <div className="flex items-center gap-3">
        {back && (
          <Link
            href={back}
            aria-label="Back"
            className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-high active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        )}
        <Orb size={34} pulse={false} />
        <div className="flex items-baseline gap-2">
          <span className="font-display-lg text-[18px] font-bold tracking-wide text-on-surface">
            RAFIQ<span className="text-primary-container">+</span>
          </span>
          <span className="text-[15px] font-semibold text-primary-container" dir="rtl">
            رفيق+
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <span className="flex items-center gap-1.5 bg-surface-container-high px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-pulse" />
          <span className="font-label-sm text-[11px] text-on-surface-variant">{status}</span>
        </span>
      </div>
    </header>
  );
}
