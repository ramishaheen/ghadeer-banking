"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/kinetic/BottomNav";
import { Sheet } from "@/components/Sheet";
import { EmptyState } from "@/components/States";
import { GoldTutorialController } from "@/components/tutorial/GoldTutorialController";
import { HubTile } from "@/components/hub/HubTile";
import { InvestGuideTooltip } from "@/components/hub/InvestGuideTooltip";
import { api, useApi } from "@/lib/client";
import type { TutorialState } from "@/lib/client";

type Service = {
  label: string;
  icon: string;
  badge?: string;
  href?: string;
};

const PRODUCTS: Service[] = [
  { label: "Bills", icon: "receipt_long", href: "/rafiq/chat?prompt=Pay%20my%20bill" },
  { label: "Loans", icon: "real_estate_agent" },
  { label: "Savings Goals", icon: "savings", href: "/rafiq/coaching" },
  { label: "Cards", icon: "credit_card" },
  { label: "Safety Box", icon: "lock" },
  { label: "Cheques", icon: "payments" },
  { label: "FlexiPay", icon: "schedule", badge: "NEW" },
  { label: "Memberships", icon: "loyalty" },
  {
    label: "Subscription Manager",
    icon: "subscriptions",
    badge: "NEW",
    href: "/rafiq/chat?prompt=Show%20my%20subscriptions",
  },
];

const INVESTMENTS: Service[] = [
  { label: "Stocks", icon: "monitoring" },
  { label: "Manage Wealth", icon: "account_balance" },
  { label: "Deposits", icon: "account_balance_wallet" },
  { label: "Physical Gold", icon: "paid", badge: "NEW", href: "/gold" },
  { label: "Precious Metals", icon: "diamond" },
];

/** Alternating orange/beige tile backgrounds per the Hub reference. */
const altBg = (i: number) => (i % 2 === 0 ? "bg-secondary-container" : "bg-primary-fixed");

export default function HubPage() {
  const router = useRouter();
  const tutorials = useApi<{ progress: TutorialState }>("/api/tutorials");
  const [tipHidden, setTipHidden] = useState(false);
  const [soon, setSoon] = useState<Service | null>(null);

  const tipShowing =
    !tipHidden && !!tutorials.data && !tutorials.data.progress.HUB_INVEST_TIP.dismissed;

  const dismissTip = () => {
    setTipHidden(true);
    void api("/api/tutorials", {
      method: "POST",
      body: JSON.stringify({ key: "HUB_INVEST_TIP", dismissed: true }),
    })
      .then(() => tutorials.reload(true))
      .catch(() => {});
  };

  const open = (s: Service) => {
    if (s.href) router.push(s.href);
    else setSoon(s);
  };

  return (
    <div className="min-h-dvh pb-32">
      {/* Top App Bar */}
      <header className="fixed top-0 inset-x-0 mx-auto max-w-[420px] z-50 bg-surface flex items-center px-container-margin py-3">
        <h1 className="font-display-lg-mobile text-display-lg-mobile text-primary">Hub</h1>
      </header>

      <main className="pt-20 px-container-margin">
        {/* Products Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md-mobile text-on-surface">Products</h3>
          </div>
          <div className="grid grid-cols-4 gap-grid-gutter items-start">
            {PRODUCTS.map((s, i) => (
              <HubTile
                key={s.label}
                label={s.label}
                icon={s.icon}
                badge={s.badge}
                bgClass={altBg(i)}
                onPress={() => open(s)}
              />
            ))}
          </div>
        </section>

        {/* Investment Section */}
        <section className="mb-10">
          <div data-tut="invest-section" className="flex justify-between items-center mb-4">
            <h3 className="font-headline-md text-headline-md-mobile text-on-surface">Investment</h3>
          </div>

          {tipShowing && (
            <InvestGuideTooltip onDismiss={dismissTip} onSee={() => router.push("/gold")} />
          )}

          <div className="grid grid-cols-4 gap-grid-gutter items-start">
            {INVESTMENTS.map((s, i) => (
              <HubTile
                key={s.label}
                label={s.label}
                icon={s.icon}
                badge={s.badge}
                primary={i === 0}
                bgClass={altBg(i + 1)}
                onPress={() => open(s)}
                id={s.label === "Physical Gold" ? "gold-tile" : undefined}
                dataTut={s.label === "Physical Gold" ? "gold-tile" : undefined}
              />
            ))}
          </div>
        </section>
      </main>

      <BottomNav />

      {/* "Available soon" sheet for services not yet wired to a flow. */}
      <Sheet open={!!soon} onClose={() => setSoon(null)} heightClass="max-h-[50dvh]">
        {soon && (
          <EmptyState
            icon={soon.icon}
            title={soon.label}
            body="This service is coming to Rafiq+ soon."
            action={{ label: "Got it", onClick: () => setSoon(null) }}
          />
        )}
      </Sheet>

      <GoldTutorialController page="hub" />
    </div>
  );
}
