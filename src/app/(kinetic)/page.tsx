"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/kinetic/TopBar";
import { BottomNav } from "@/components/kinetic/BottomNav";
import { ErrorState, ScreenSkeleton } from "@/components/States";
import { TutorialScrim } from "@/components/tutorial/TutorialScrim";
import { GoldTutorialController } from "@/components/tutorial/GoldTutorialController";
import { BalanceCard } from "@/components/home/BalanceCard";
import { CashbackCard } from "@/components/home/CashbackCard";
import { AccountsList } from "@/components/home/AccountsList";
import { RecentActivity } from "@/components/home/RecentActivity";
import { HomeAiLayer } from "@/components/home/HomeAiLayer";
import { api, useApi } from "@/lib/client";
import type { Me, TutorialState } from "@/lib/client";

type Summary = { monthInMils: number; monthOutMils: number; cashbackMils: number };

export default function HomePage() {
  const router = useRouter();
  const me = useApi<Me>("/api/me");
  const summary = useApi<Summary>("/api/summary");
  const tutorials = useApi<{ progress: TutorialState }>("/api/tutorials");

  // Balance visibility: master toggle for the total + per-account overrides.
  const [totalShown, setTotalShown] = useState(false);
  const [acctShown, setAcctShown] = useState<Record<string, boolean>>({});
  // Session-local overrides so dismissals hide bubbles instantly.
  const [kycHidden, setKycHidden] = useState(false);
  const [tipHidden, setTipHidden] = useState(false);

  const m = me.data;
  const sum = summary.data;
  const progress = tutorials.data?.progress ?? null;

  if (!m) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        {me.error ? (
          <div className="pt-16">
            <ErrorState message={me.error} onRetry={() => void me.reload()} />
          </div>
        ) : (
          <ScreenSkeleton />
        )}
        <BottomNav />
      </div>
    );
  }

  // KYC takes priority over the smart tip when both are eligible.
  const kycShowing =
    !kycHidden && m.user.kycStatus === "DUE" && !!progress && !progress.KYC_UPDATE.dismissed;
  const tipShowing = !kycShowing && !tipHidden && !!progress && !progress.HOME_AI_TIP.dismissed;

  const toggleTotal = () => {
    const next = !totalShown;
    setTotalShown(next);
    // The master reveal drives the account cards too; "Show" overrides per card.
    setAcctShown(Object.fromEntries(m.accounts.map((a) => [a.id, next] as const)));
  };
  const toggleAccount = (id: string) => setAcctShown((s) => ({ ...s, [id]: !s[id] }));

  const dismissKyc = () => {
    setKycHidden(true);
    void api("/api/tutorials", {
      method: "POST",
      body: JSON.stringify({ key: "KYC_UPDATE", dismissed: true }),
    })
      .then(() => tutorials.reload(true))
      .catch(() => {});
  };

  const onWithdrawn = () => {
    void me.reload(true);
    void summary.reload(true);
  };

  return (
    <div className="min-h-dvh pb-36">
      <TopBar membership={m.user.membership} name={m.user.name} />

      <div className="pt-16">
        {/* AI Layer status bar (design 18) */}
        <div className="bg-primary-container/10 border-y border-primary-container/20 py-1 flex justify-center items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-container glow-breathe" aria-hidden />
          <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
            AI Layer active
          </span>
        </div>

        <main className="px-container-margin space-y-6">
          <BalanceCard
            totalMils={m.totalMils}
            shown={totalShown}
            onToggle={toggleTotal}
            inMils={sum ? sum.monthInMils : null}
            outMils={sum ? sum.monthOutMils : null}
            summaryLoading={summary.loading}
            summaryError={summary.error}
            onRetrySummary={() => void summary.reload()}
          />

          <CashbackCard
            cashbackMils={sum ? sum.cashbackMils : null}
            loading={summary.loading}
            onWithdrawn={onWithdrawn}
          />

          <AccountsList accounts={m.accounts} shownMap={acctShown} onToggleAccount={toggleAccount} />

          {/* Promo Banner */}
          <section className="relative h-40 rounded-xl overflow-hidden shadow-sm group">
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG art, no optimization needed */}
            <img
              alt="Rafiq+ Vaults promotion"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              src="/promo-vaults.svg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-element-padding text-white">
              <span className="bg-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit mb-2">
                New Offering
              </span>
              <h3 className="font-headline-md text-headline-md-mobile leading-tight">
                Secure your future with Rafiq+ Vaults
              </h3>
            </div>
          </section>

          <RecentActivity />
        </main>
      </div>

      <HomeAiLayer
        showTip={tipShowing}
        hintHidden={kycShowing}
        onTipDismissed={() => {
          setTipHidden(true);
          void tutorials.reload(true);
        }}
      />

      <BottomNav />

      {/* KYC annual update trigger (design 27) — spotlights the home orb. */}
      {kycShowing && (
        <TutorialScrim
          targetSelector='[data-tut="home-orb"]'
          speech={"It's time for your annual KYC update to keep your account secure. Ready to start?"}
          step={1}
          totalSteps={5}
          bubblePosition="center"
          buttons={[
            { label: "Let's go", onClick: () => router.push("/kyc") },
            { label: "Maybe later", variant: "link", onClick: dismissKyc },
          ]}
        />
      )}

      <GoldTutorialController page="home" />
    </div>
  );
}
