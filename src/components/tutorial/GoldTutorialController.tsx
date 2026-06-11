"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type GoldProduct, type TutorialState } from "@/lib/client";
import { fmtJod } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { Orb } from "@/components/rafiq/Orb";
import { TutorialScrim } from "@/components/tutorial/TutorialScrim";

type Page = "home" | "hub" | "gold";
type GoldBuyState = { step: number; dismissed: boolean; completed: boolean };

const KEY = "GOLD_BUY";

/** The anchor whose click advances each frame (per the data-tut contract). */
const ADVANCE_TARGETS: Record<number, string> = {
  2: '[data-tut="gold-tile"]',
  3: '[data-tut="gold-5g-add"]',
  4: '[data-tut="confirm-purchase"]',
};

const WAVE_BARS = [
  { h: 18, d: "0.1s" },
  { h: 34, d: "0.3s" },
  { h: 22, d: "0.5s" },
  { h: 40, d: "0.2s" },
  { h: 26, d: "0.4s" },
  { h: 38, d: "0.6s" },
  { h: 18, d: "0.1s" },
];

function rectsDiffer(a: DOMRect | null, b: DOMRect | null) {
  if (!a || !b) return a !== b;
  return (
    Math.abs(a.top - b.top) > 1 ||
    Math.abs(a.left - b.left) > 1 ||
    Math.abs(a.width - b.width) > 1 ||
    Math.abs(a.height - b.height) > 1
  );
}

/**
 * Polls for a selector and returns its viewport rect once the element exists
 * AND has settled (two consecutive matching measurements), so spotlights and
 * click proxies don't lock onto a mid-animation position (e.g. a bottom sheet
 * still sliding up). Keeps tracking afterwards (resize / scroll / poll).
 */
function useSettledRect(selector: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const lastRef = useRef<DOMRect | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    lastRef.current = null;
    settledRef.current = false;
    setRect(null);
    if (!selector) return;

    const measure = () => {
      const el = document.querySelector(selector);
      const next = el ? el.getBoundingClientRect() : null;
      if (!next || next.width === 0 || next.height === 0) {
        lastRef.current = null;
        settledRef.current = false;
        setRect((r) => (r === null ? r : null));
        return;
      }
      if (!settledRef.current) {
        if (lastRef.current && !rectsDiffer(lastRef.current, next)) {
          settledRef.current = true;
          setRect(next);
        }
        lastRef.current = next;
        return;
      }
      lastRef.current = next;
      setRect((r) => (rectsDiffer(r, next) ? next : r));
    };

    measure();
    const poll = setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearInterval(poll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [selector]);

  return rect;
}

/** Re-dispatch the user's tap to the real page element behind the scrim. */
function forwardClick(selector: string) {
  document.querySelector<HTMLElement>(selector)?.click();
}

/**
 * Transparent button overlaid on the spotlighted element (same coordinate
 * space as TutorialScrim's spotlight ring), so tapping the highlighted target
 * works even though the scrim blocks the page underneath.
 */
function ProxyButton({
  rect,
  label,
  onClick,
}: {
  rect: DOMRect;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute rounded-2xl"
      style={{
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      }}
    />
  );
}

function ChipButton({
  children,
  primary,
  onClick,
}: {
  children: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-label-sm font-label-sm transition-colors active:scale-95 ${
        primary
          ? "bg-primary-container text-white shadow-sm"
          : "bg-surface-container-high text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container-highest"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Drives the 6-frame guided gold purchase (designs 17→09→00→05→12→19) across
 * the home, hub and gold pages via the tutorials API. Next.js requires
 * useSearchParams to live under a Suspense boundary, hence the wrapper.
 */
export function GoldTutorialController({ page }: { page: "home" | "hub" | "gold" }) {
  return (
    <Suspense fallback={null}>
      <Controller page={page} />
    </Suspense>
  );
}

function Controller({ page }: { page: Page }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsReset = page === "home" && searchParams.get("tutorial") === "gold";

  const [state, setState] = useState<GoldBuyState | null>(null);
  const [price5gMils, setPrice5gMils] = useState<number | null>(null);
  const [chipsReady, setChipsReady] = useState(false);
  const [intent, setIntent] = useState("");
  const initRef = useRef(false);
  const caughtUpRef = useRef(false);
  const lastAdvanceRef = useRef(-1);

  // ── Load GOLD_BUY progress (or reset it when arriving with ?tutorial=gold) ──
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (wantsReset) {
          await api("/api/tutorials", {
            method: "POST",
            body: JSON.stringify({ key: KEY, step: 0, dismissed: false, completed: false }),
          });
          if (!cancelled) setState({ step: 0, dismissed: false, completed: false });
          return;
        }
        const { progress } = await api<{ progress: TutorialState }>("/api/tutorials");
        if (!cancelled) setState(progress[KEY]);
      } catch {
        /* the overlay simply stays hidden if progress can't load */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wantsReset]);

  const post = useCallback(
    (body: Record<string, unknown>) =>
      api("/api/tutorials", { method: "POST", body: JSON.stringify({ key: KEY, ...body }) }),
    []
  );

  const skip = useCallback(() => {
    setState((s) => (s ? { ...s, dismissed: true } : s));
    void post({ dismissed: true }).catch(() => {});
  }, [post]);

  /** Dismiss the tutorial and hand the user over to a real flow (frame-2 chips). */
  const exitTo = useCallback(
    (to: string) => {
      setState((s) => (s ? { ...s, dismissed: true } : s));
      void post({ dismissed: true }).catch(() => {});
      router.push(to);
    },
    [post, router]
  );

  /**
   * Advance to `next` exactly once (proxy clicks and the capture listener can
   * both fire for the same tap). `completed` marks the server record done at
   * confirm time while the local session stays active so frame 6 can still
   * show. `to` navigates after the POST resolves so the destination page reads
   * fresh progress.
   */
  const advance = useCallback(
    async (next: number, opts?: { completed?: boolean; to?: string }) => {
      if (lastAdvanceRef.current >= next) return;
      lastAdvanceRef.current = next;
      setState((s) => (s ? { ...s, step: next } : s));
      try {
        await post({ step: next, ...(opts?.completed ? { completed: true } : {}) });
      } catch {
        /* keep going — local state already advanced */
      }
      if (opts?.to) router.push(opts.to);
    },
    [post, router]
  );

  const finish = useCallback(() => {
    setState((s) => (s ? { ...s, completed: true } : s));
    void post({ completed: true }).catch(() => {});
  }, [post]);

  const startGoldPath = useCallback(() => void advance(2, { to: "/hub" }), [advance]);

  const active = !!state && !state.dismissed && !state.completed;
  const step = state?.step ?? -1;

  // Steps are page-scoped (0-1 home, 2 hub, 3-5 gold); anything else renders nothing.
  const frame =
    active &&
    ((page === "home" && (step === 0 || step === 1)) ||
      (page === "hub" && step === 2) ||
      (page === "gold" && (step === 3 || step === 4 || step === 5)))
      ? step
      : null;

  // ── Spotlight / proxy geometry ──
  const orbRect = useSettledRect(frame === 0 ? '[data-tut="home-orb"]' : null);
  const tileRect = useSettledRect(frame === 2 ? ADVANCE_TARGETS[2] : null);
  const cardRect = useSettledRect(frame === 3 ? '[data-tut="gold-5g-card"]' : null);
  const addRect = useSettledRect(frame === 3 ? ADVANCE_TARGETS[3] : null);
  const confirmRect = useSettledRect(frame === 4 ? ADVANCE_TARGETS[4] : null);

  // ── Real 5g price for the frame-4 speech ──
  useEffect(() => {
    if (frame !== 3 || price5gMils !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await api<{ pricePerGramMils: number; priceAt: string; products: GoldProduct[] }>(
          "/api/gold/products"
        );
        const fiveG = d.products.find((p) => p.weightGrams === 5);
        if (!cancelled && fiveG) setPrice5gMils(fiveG.priceMils);
      } catch {
        /* speech falls back to wording without the figure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [frame, price5gMils]);

  // ── Advance when the real anchor element is clicked (capture phase) ──
  useEffect(() => {
    if (frame !== 2 && frame !== 3 && frame !== 4) return;
    const selector = ADVANCE_TARGETS[frame];
    const next = frame + 1;
    const completed = frame === 4;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest(selector)) {
        void advance(next, completed ? { completed: true } : undefined);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [frame, advance]);

  // ── Frame 6: wait for the gold page's success chips to appear ──
  useEffect(() => {
    if (frame !== 5 || chipsReady) return;
    const poll = setInterval(() => {
      if (document.querySelector('[data-tut="success-chips"]')) setChipsReady(true);
    }, 500);
    return () => clearInterval(poll);
  }, [frame, chipsReady]);

  // If we land on a page one step early (the previous page's POST may still be
  // in flight), refetch once shortly after mount to catch up.
  useEffect(() => {
    if (!active || caughtUpRef.current) return;
    const arrivedEarly =
      (page === "hub" && step === 1) || (page === "gold" && step === 2);
    if (!arrivedEarly) return;
    caughtUpRef.current = true;
    const t = setTimeout(async () => {
      try {
        const { progress } = await api<{ progress: TutorialState }>("/api/tutorials");
        setState(progress[KEY]);
      } catch {
        /* leave the overlay hidden */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [active, page, step]);

  if (frame === null) return null;

  const speech3 = `The 1g and 2.5g bars are out of stock. The 5g bar is the smallest available today at ${
    price5gMils !== null ? fmtJod(price5gMils) : "today's live price"
  }. Tap the plus to add it to your order.`;

  return (
    // Painted above page-owned bottom sheets (z-[80]) so frames 5 and 6 can
    // spotlight elements inside them.
    <div className="relative z-[90]">
      {/* Frame 1 — floating "Ask me anything." hint pinned above the home orb */}
      {frame === 0 && orbRect && (
        <div
          className="fixed fade-up"
          style={{
            top: Math.max(8, orbRect.top - 10),
            right: Math.max(8, window.innerWidth - orbRect.right),
            transform: "translateY(-100%)",
          }}
        >
          <div className="flex items-center gap-1 bg-white rounded-full shadow-xl border border-black/5 pl-4 pr-1.5 py-1.5">
            <button
              type="button"
              onClick={() => void advance(1)}
              className="text-[13px] font-semibold text-zinc-900 active:scale-95 transition-transform py-1"
            >
              Ask me anything.
            </button>
            <button
              type="button"
              aria-label="Dismiss tutorial hint"
              onClick={skip}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 active:scale-95 transition-transform"
            >
              <Icon name="close" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
      )}

      {/* Frame 2 — intent capture bottom sheet (design 09) */}
      {frame === 1 && (
        <div
          className="fixed inset-0 z-[70] mx-auto max-w-[420px]"
          role="dialog"
          aria-modal="true"
          aria-label="What do you want to do?"
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-surface-container-lowest rounded-t-[32px] shadow-2xl sheet-up">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full border-4 border-surface-container-lowest">
              <Orb size={48} />
            </div>
            <button
              type="button"
              aria-label="Skip tutorial"
              onClick={skip}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:scale-95 transition-transform"
            >
              <Icon name="close" style={{ fontSize: 20 }} />
            </button>
            <div className="h-full flex flex-col px-container-margin pt-6 pb-5 overflow-y-auto hide-scrollbar">
              <div className="w-12 h-1.5 bg-outline-variant/50 rounded-full mx-auto mb-7 shrink-0" />
              <h2 className="font-headline-md text-headline-md text-center text-on-surface mb-6">
                What do you want to do?
              </h2>
              <div className="flex items-center justify-center gap-1.5 h-14 mb-6 shrink-0" aria-hidden>
                {WAVE_BARS.map((bar, i) => (
                  <span
                    key={i}
                    className={`wave-bar w-1 rounded-full ${i % 2 ? "bg-primary" : "bg-primary-container"}`}
                    style={{ height: bar.h, animationDelay: bar.d }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <ChipButton
                  onClick={() => exitTo(`/rafiq/chat?prompt=${encodeURIComponent("Pay my bill")}`)}
                >
                  Pay a bill
                </ChipButton>
                <ChipButton onClick={() => exitTo("/rafiq/transfer")}>Transfer money</ChipButton>
                <ChipButton primary onClick={startGoldPath}>
                  Buy gold
                </ChipButton>
                <ChipButton onClick={() => exitTo("/rafiq/coaching")}>
                  Open a savings goal
                </ChipButton>
              </div>
              <form
                className="mt-auto shrink-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = intent.trim();
                  if (!v) return;
                  if (v.toLowerCase().includes("gold")) startGoldPath();
                  else exitTo(`/rafiq/chat?prompt=${encodeURIComponent(v)}`);
                }}
              >
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={intent}
                    onChange={(e) => {
                      setIntent(e.target.value);
                      if (e.target.value.toLowerCase().includes("buy gold")) startGoldPath();
                    }}
                    placeholder="Type or speak your goal."
                    aria-label="Type your goal"
                    className="w-full h-14 bg-surface-container-low border-none rounded-full px-6 pr-14 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary-container/40"
                  />
                  <span
                    className="absolute right-2 w-10 h-10 bg-primary-container rounded-full flex items-center justify-center text-white"
                    aria-hidden
                  >
                    <Icon name="mic" filled style={{ fontSize: 20 }} />
                  </span>
                </div>
              </form>
              <button
                type="button"
                onClick={skip}
                className="mt-4 mx-auto shrink-0 text-label-sm font-label-sm text-on-surface-variant underline underline-offset-4 active:scale-95 transition-transform"
              >
                Skip tutorial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Frame 3 — path highlight on the hub's Physical Gold tile (design 00) */}
      {frame === 2 && tileRect && (
        <TutorialScrim
          targetSelector='[data-tut="gold-tile"]'
          speech="Physical Gold lives under Investment. Tap it to see available bars."
          step={2}
          totalSteps={5}
          buttons={[
            { label: "Skip tutorial", variant: "link", onClick: skip },
            { label: "Next", onClick: () => void advance(3, { to: "/gold" }) },
          ]}
        >
          <ProxyButton
            rect={tileRect}
            label="Open Physical Gold"
            onClick={() => void advance(3, { to: "/gold" })}
          />
        </TutorialScrim>
      )}

      {/* Frame 4 — 5g bar selection in the gold shop (design 05) */}
      {frame === 3 && cardRect && (
        <TutorialScrim
          targetSelector='[data-tut="gold-5g-card"]'
          speech={speech3}
          note="Live price, updated every 60 seconds."
          step={3}
          totalSteps={5}
          buttons={[{ label: "Skip tutorial", variant: "link", onClick: skip }]}
        >
          {addRect && (
            <ProxyButton
              rect={addRect}
              label="Add the 5g gold bar to your order"
              onClick={() => {
                void advance(4);
                forwardClick(ADVANCE_TARGETS[3]);
              }}
            />
          )}
        </TutorialScrim>
      )}

      {/* Frame 5 — confirmation inside the purchase sheet (design 12) */}
      {frame === 4 && confirmRect && (
        <TutorialScrim
          targetSelector='[data-tut="confirm-purchase"]'
          speech="Funds will be debited from your selected account. Tap Confirm to lock in this price."
          step={4}
          totalSteps={5}
          bubblePosition="center"
          buttons={[{ label: "Skip tutorial", variant: "link", onClick: skip }]}
        >
          <ProxyButton
            rect={confirmRect}
            label="Confirm purchase"
            onClick={() => {
              void advance(5, { completed: true });
              forwardClick(ADVANCE_TARGETS[4]);
            }}
          />
        </TutorialScrim>
      )}

      {/* Frame 6 — success follow-up on the order chips (design 19) */}
      {frame === 5 && chipsReady && (
        <TutorialScrim
          targetSelector='[data-tut="success-chips"]'
          speech="Done. I have added a reminder to check gold prices weekly. Want me to set a price alert?"
          step={5}
          totalSteps={5}
          bubblePosition="top"
          buttons={[{ label: "Finish", onClick: finish }]}
        />
      )}
    </div>
  );
}
