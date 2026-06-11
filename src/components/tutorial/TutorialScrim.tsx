"use client";

import { useEffect, useState } from "react";
import { Orb } from "@/components/rafiq/Orb";

export type TutorialFrameProps = {
  /** CSS selector (e.g. '[data-tut="gold-tile"]') to spotlight; null = no cutout. */
  targetSelector?: string | null;
  /** Speech bubble text from the orb. */
  speech: string;
  /** Optional secondary note line under the speech. */
  note?: string;
  /** Progress: current step (1-based) and total dots. */
  step: number;
  totalSteps: number;
  buttons: { label: string; onClick: () => void; variant?: "primary" | "link" }[];
  /** Place the bubble near the top or bottom of the screen. */
  bubblePosition?: "top" | "center" | "bottom";
  children?: React.ReactNode;
};

/**
 * The AI tutorial overlay: 30% black scrim, a glowing ring spotlight around
 * the target element, the orb pointing at it, a speech bubble, progress dots
 * and action buttons — matching the designed tutorial frames.
 */
export function TutorialScrim({
  targetSelector,
  speech,
  note,
  step,
  totalSteps,
  buttons,
  bubblePosition = "bottom",
  children,
}: TutorialFrameProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetSelector) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(targetSelector);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [targetSelector]);

  const pos =
    bubblePosition === "top"
      ? "top-20"
      : bubblePosition === "center"
        ? "top-1/2 -translate-y-1/2"
        : "bottom-28";

  return (
    // Full-viewport fixed layer: the spotlight uses viewport coordinates, so
    // this wrapper must not be offset by the centered phone canvas.
    <div className="fixed inset-0 z-[70]" data-testid="tutorial-scrim">
      {/* 30% black scrim with spotlight cutout */}
      {rect ? (
        <div
          className="absolute rounded-2xl transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.30), 0 0 0 4px #ff6b00, 0 0 24px 6px rgba(255,107,0,0.55)",
          }}
        >
          <div className="absolute inset-0 rounded-2xl orb-pulse" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      )}

      {/* Bubble + orb — constrained to the phone canvas width */}
      <div className={`absolute inset-x-0 mx-auto max-w-[420px] px-4 ${pos} fade-up`}>
        <div className="flex items-end gap-3">
          <Orb size={48} />
          <div className="flex-1 bg-white rounded-2xl rounded-bl-md shadow-xl p-4">
            <p className="text-[14.5px] leading-snug font-medium text-zinc-900">{speech}</p>
            {note && <p className="mt-1.5 text-[12px] text-zinc-500">{note}</p>}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1.5" aria-label={`Step ${step} of ${totalSteps}`}>
                {Array.from({ length: totalSteps }, (_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i < step ? "bg-[#ff6b00]" : "bg-zinc-300"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                {buttons.map((b) =>
                  b.variant === "link" ? (
                    <button
                      key={b.label}
                      onClick={b.onClick}
                      className="text-[12.5px] font-semibold text-zinc-500 active:scale-95 transition-transform"
                    >
                      {b.label}
                    </button>
                  ) : (
                    <button
                      key={b.label}
                      onClick={b.onClick}
                      className="px-4 py-2 bg-[#ff6b00] text-white text-[12.5px] font-bold rounded-full active:scale-95 transition-transform"
                    >
                      {b.label}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
