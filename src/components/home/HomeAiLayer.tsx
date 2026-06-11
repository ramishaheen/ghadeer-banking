"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Orb } from "@/components/rafiq/Orb";
import { api } from "@/lib/client";

/**
 * The AI layer on Home (designs 18 + 15): floating orb FAB above the bottom
 * nav with an "Ask me anything." hint tag, plus the dismissible Kinetic AI
 * smart-tip speech bubble over a semi-dim (click-through) backdrop.
 */
export function HomeAiLayer({
  showTip,
  hintHidden,
  onTipDismissed,
}: {
  showTip: boolean;
  hintHidden: boolean;
  onTipDismissed: () => void;
}) {
  const router = useRouter();
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const postDismiss = () =>
    api("/api/tutorials", {
      method: "POST",
      body: JSON.stringify({ key: "HOME_AI_TIP", dismissed: true }),
    });

  const tellMeMore = () => {
    // Record the dismissal without blocking navigation to the Hub.
    void postDismiss().catch(() => {});
    onTipDismissed();
    router.push("/hub");
  };

  const maybeLater = async () => {
    setPosting(true);
    setError(null);
    try {
      await postDismiss();
      onTipDismissed();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      {/* Semi-dim backdrop behind the smart tip — page stays visible and tappable. */}
      {showTip && (
        <div
          className="fixed inset-0 z-[55] mx-auto max-w-[420px] bg-black/25 backdrop-blur-[2px] pointer-events-none"
          aria-hidden
        />
      )}

      <div className="fixed bottom-24 inset-x-0 mx-auto max-w-[420px] z-[60] pointer-events-none">
        <div className="flex flex-col items-end gap-3 px-4">
          {showTip && (
            <div className="pointer-events-auto relative max-w-[280px] bg-surface-container-lowest rounded-2xl p-4 shadow-xl border border-surface-container-high fade-up">
              <p className="font-body-md text-body-md text-on-surface mb-4">
                {"Hi! I'm Rafiq. Want help choosing your first investment?"}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  disabled={posting}
                  onClick={tellMeMore}
                  className="w-full py-2.5 bg-primary text-on-primary rounded-full font-bold text-label-sm active:scale-95 transition-transform disabled:opacity-60"
                >
                  Tell me more
                </button>
                <button
                  disabled={posting}
                  onClick={() => void maybeLater()}
                  className="w-full py-2.5 bg-surface-container-high text-on-surface rounded-full font-bold text-label-sm active:scale-95 transition-transform disabled:opacity-60"
                >
                  Maybe later
                </button>
              </div>
              {error && (
                <p className="mt-2 text-error font-label-sm text-label-sm" role="alert">
                  {error}
                </p>
              )}
              {/* Bubble tail pointing at the orb */}
              <div
                className="absolute -bottom-2 right-6 w-4 h-4 bg-surface-container-lowest rotate-45 border-r border-b border-surface-container-high"
                aria-hidden
              />
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-2">
            {!hintHidden && !showTip && (
              <span className="bg-surface-container-lowest border border-surface-container px-3 py-1.5 rounded-full shadow-md font-label-sm text-label-sm text-on-surface-variant fade-up">
                Ask me anything.
              </span>
            )}
            <div data-tut="home-orb" className="rounded-full">
              <Orb size={56} onClick={() => router.push("/rafiq")} label="Open Rafiq, your AI assistant" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
