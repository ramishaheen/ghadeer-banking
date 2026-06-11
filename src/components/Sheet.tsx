"use client";

import { useEffect } from "react";

/** Bottom sheet with scrim — the modal pattern used across the designs. */
export function Sheet({
  open,
  onClose,
  children,
  heightClass = "max-h-[85dvh]",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  heightClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-[80]" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-black/30"
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-3xl shadow-2xl sheet-up overflow-y-auto hide-scrollbar ${heightClass}`}
      >
        <div className="w-10 h-1 rounded-full bg-surface-container-highest mx-auto mt-3 mb-1" />
        {children}
      </div>
    </div>
  );
}
