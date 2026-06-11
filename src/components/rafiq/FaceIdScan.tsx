"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";

/**
 * FaceID confirmation overlay (Rafiq task-execution design): centered glass
 * modal with a pulsing face icon. After a 1.6s simulated scan it fires
 * `onScanned` exactly once — the parent then performs the real API call
 * (pass `busy` while that request is in flight). Cancelling before the scan
 * completes aborts without calling anything.
 */
export function FaceIdScan({
  open,
  busy = false,
  label = "FaceID to Confirm",
  sublabel = "Hold still — confirming it's you.",
  onCancel,
  onScanned,
}: {
  open: boolean;
  busy?: boolean;
  label?: string;
  sublabel?: string;
  onCancel: () => void;
  onScanned: () => void;
}) {
  const scanRef = useRef(onScanned);

  useEffect(() => {
    scanRef.current = onScanned;
  }, [onScanned]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => scanRef.current(), 1600);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm fade-up"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="glass-panel rounded-3xl p-8 w-[300px] flex flex-col items-center gap-5 text-center">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary-container/25 animate-ping" aria-hidden />
          <span className="absolute inset-2 rounded-full border border-primary-container/40" aria-hidden />
          <Icon name="familiar_face_and_zone" className="text-[56px] text-primary relative z-10" />
        </div>
        <div className="space-y-1">
          <p className="font-headline-md text-headline-md-mobile text-on-surface">{label}</p>
          <p className="font-body-md text-[13px] leading-5 text-on-surface-variant">
            {busy ? "Verified — executing securely…" : sublabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 px-6 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface disabled:opacity-40 active:scale-95 transition-transform"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
