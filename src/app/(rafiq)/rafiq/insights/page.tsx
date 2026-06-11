"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Orb } from "@/components/rafiq/Orb";
import { RafiqTopBar } from "@/components/rafiq/RafiqTopBar";
import { ErrorState, Skeleton } from "@/components/States";
import { api, useApi, type Insight } from "@/lib/client";
import { fmtJod } from "@/lib/format";

type SavingsCompareData = { current: number; previous: number; savedMils: number };
type SubAuditData = { totalMils: number; items: { merchant: string; amountMils: number }[] };
type GoalTipData = { goalId: string; extraMils: number; monthsSaved: number };

const KIND_BADGE: Record<string, string> = {
  SAVINGS_COMPARE: "Savings Alert",
  SUBSCRIPTION_AUDIT: "Subscriptions",
  GOAL_TIP: "Goal Tip",
};

function parseData<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Designed comparison chart: two vertical bars, last month vs this month. */
function CompareChart({ data }: { data: SavingsCompareData }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 250);
    return () => clearTimeout(t);
  }, []);
  const prevH = 128;
  const curH = data.previous > 0 ? Math.max(16, Math.round((data.current / data.previous) * prevH)) : 96;
  return (
    <section className="glass-panel rounded-xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-end h-44 gap-6 px-4 relative z-10">
        <div className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
          <div
            className="w-full bg-surface-container-highest rounded-t-lg transition-all duration-700 ease-out"
            style={{ height: grown ? prevH : 0 }}
          />
          <span className="font-label-sm text-label-sm text-outline">LAST MO.</span>
          <span className="text-[10px] text-outline font-label-sm">{fmtJod(data.previous)}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
          <div
            className="w-full bg-primary-container rounded-t-lg relative transition-all duration-700 ease-out"
            style={{ height: grown ? curH : 0, boxShadow: "0 0 15px rgba(241, 100, 59, 0.4)" }}
          >
            <div
              className={`absolute -top-9 left-1/2 -translate-x-1/2 bg-white text-on-primary-container font-label-sm text-[11px] px-2 py-1 rounded-md shadow-lg whitespace-nowrap transition-opacity duration-500 ${
                grown ? "opacity-100" : "opacity-0"
              }`}
            >
              - {fmtJod(data.savedMils)}
            </div>
          </div>
          <span className="font-label-sm text-label-sm text-primary">THIS MO.</span>
          <span className="text-[10px] text-primary/80 font-label-sm">{fmtJod(data.current)}</span>
        </div>
      </div>
      {/* Background sparkline decor */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden>
        <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rafiq-insight-spark" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f1643b" stopOpacity="1" />
              <stop offset="100%" stopColor="#f1643b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,150 L50,130 L100,140 L150,110 L200,120 L250,90 L300,100 L350,70 L400,80 L400,150 L0,150 Z"
            fill="url(#rafiq-insight-spark)"
          />
        </svg>
      </div>
    </section>
  );
}

export default function RafiqInsightsPage() {
  const router = useRouter();
  const insQ = useApi<{ insights: Insight[] }>("/api/rafiq/insights");

  const [list, setList] = useState<Insight[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [acting, setActing] = useState<"act" | "dismiss" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (insQ.data && list === null) {
      setList(insQ.data.insights.filter((i) => i.status === "NEW"));
    }
  }, [insQ.data, list]);

  const current = list && list.length > 0 ? list[Math.min(idx, list.length - 1)] : null;

  const takeAction = async (insight: Insight) => {
    if (acting) return;
    setActing("act");
    setActionError(null);
    try {
      await api(`/api/rafiq/insights/${insight.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTED" }),
      });
      if (insight.kind === "SUBSCRIPTION_AUDIT") {
        router.push("/rafiq/chat?prompt=Show%20my%20subscriptions");
        return;
      }
      if (insight.kind === "GOAL_TIP") {
        const d = parseData<GoalTipData>(insight.dataJson);
        if (d?.goalId) {
          const { goals } = await api<{ goals: { id: string; monthlyMils: number }[] }>("/api/goals");
          const goal = goals.find((g) => g.id === d.goalId);
          if (goal) {
            await api(`/api/goals/${goal.id}`, {
              method: "PATCH",
              body: JSON.stringify({ monthlyMils: goal.monthlyMils + (d.extraMils || 20_000) }),
            });
          }
        }
        router.push("/rafiq/coaching");
        return;
      }
      // SAVINGS_COMPARE and anything else → coaching view
      router.push("/rafiq/coaching");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Something went wrong.");
      setActing(null);
    }
  };

  const dismiss = async (insight: Insight) => {
    if (acting) return;
    setActing("dismiss");
    setActionError(null);
    try {
      await api(`/api/rafiq/insights/${insight.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DISMISSED" }),
      });
      setList((l) => {
        const next = (l ?? []).filter((x) => x.id !== insight.id);
        setIdx((i) => (next.length === 0 ? 0 : Math.min(i, next.length - 1)));
        return next;
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't dismiss this insight.");
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="h-dvh flex flex-col relative overflow-hidden">
      {/* Full-screen orange gradient overlay + glow orbs (design 11) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(218, 83, 44, 0.20) 0%, rgba(19, 19, 19, 1) 100%)" }}
        aria-hidden
      />
      <div className="kinetic-glow absolute -top-10 -right-10 w-64 h-64 rounded-full pointer-events-none" aria-hidden />
      <div className="kinetic-glow absolute bottom-40 left-10 w-48 h-48 rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 flex flex-col h-full">
        <RafiqTopBar back="/rafiq" status="Online" />

        {insQ.loading && list === null ? (
          <div className="flex-1 px-container-padding pt-10 space-y-6">
            <Skeleton className="h-7 w-36 rounded-full" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : insQ.error && list === null ? (
          <div className="flex-1">
            <ErrorState message={insQ.error ?? "Couldn't load insights."} onRetry={() => void insQ.reload()} />
          </div>
        ) : !current ? (
          /* Empty state — all caught up */
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-container-padding fade-up">
            <Orb size={72} />
            <h1 className="font-headline-md text-headline-md text-on-surface">All caught up</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-[30ch]">
              Rafiq will surface new insights as your activity changes.
            </p>
            <Link
              href="/rafiq"
              className="mt-2 min-h-11 px-8 py-3.5 bg-primary-container text-white rounded-full font-label-sm text-label-sm active:scale-95 transition-transform"
            >
              Back to Rafiq
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto hide-scrollbar px-container-padding pt-6 pb-8 flex flex-col justify-between gap-6">
            {/* Insight text block */}
            <section className="space-y-4 relative fade-up" key={current.id}>
              <div className="absolute top-0 right-0 pointer-events-none opacity-90" aria-hidden>
                <Orb size={40} />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/20 border border-primary/20">
                <Icon name="insights" filled className="text-[14px] text-primary" />
                <span className="font-label-sm text-label-sm text-primary uppercase">
                  {KIND_BADGE[current.kind] ?? "Insight"}
                </span>
              </div>
              <h1 className="font-headline-md text-headline-md leading-tight text-on-surface pr-12">{current.title}</h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-[300px]">{current.body}</p>
              {current.bodyAr && (
                <p className="font-body-md text-[14px] leading-6 text-on-surface-variant/80" dir="rtl">
                  {current.bodyAr}
                </p>
              )}
            </section>

            {/* Kind-specific visual */}
            {current.kind === "SAVINGS_COMPARE" &&
              (() => {
                const d = parseData<SavingsCompareData>(current.dataJson);
                return d ? <CompareChart data={d} /> : null;
              })()}

            {current.kind === "SUBSCRIPTION_AUDIT" &&
              (() => {
                const d = parseData<SubAuditData>(current.dataJson);
                if (!d) return null;
                return (
                  <section className="glass-panel rounded-xl overflow-hidden">
                    <div className="divide-y divide-white/5 max-h-60 overflow-y-auto hide-scrollbar">
                      {d.items.map((it, i) => (
                        <div key={`${it.merchant}-${i}`} className="flex justify-between items-center px-5 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                              <Icon name="subscriptions" className="text-primary text-[18px]" />
                            </div>
                            <span className="font-body-md text-body-md text-on-surface truncate">{it.merchant}</span>
                          </div>
                          <span className="font-headline-md text-[15px] text-on-surface shrink-0">
                            {fmtJod(it.amountMils)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center px-5 py-3.5 border-t border-white/10 bg-surface-container-low/60">
                      <span className="font-label-sm text-label-sm uppercase text-outline">Total / month</span>
                      <span className="font-headline-md text-[17px] text-primary">{fmtJod(d.totalMils)}</span>
                    </div>
                  </section>
                );
              })()}

            {current.kind === "GOAL_TIP" &&
              (() => {
                const d = parseData<GoalTipData>(current.dataJson);
                if (!d) return null;
                return (
                  <section className="glass-panel rounded-xl p-6 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-primary-container/20 border border-primary/20 flex items-center justify-center shrink-0">
                      <Icon name="flag" filled className="text-primary text-[30px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display-lg-mobile text-display-lg-mobile text-on-surface">
                        {d.monthsSaved} month{d.monthsSaved === 1 ? "" : "s"} early
                      </p>
                      <p className="font-body-md text-[14px] leading-6 text-on-surface-variant">
                        by adding {fmtJod(d.extraMils)} to your monthly contribution
                      </p>
                    </div>
                  </section>
                );
              })()}

            {/* Actions */}
            <footer className="space-y-3">
              {actionError && (
                <p className="text-error font-label-sm text-label-sm text-center" role="alert">
                  {actionError}
                </p>
              )}
              {list && list.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  {list.map((x, i) => (
                    <span
                      key={x.id}
                      className={`h-1.5 rounded-full transition-all ${
                        i === Math.min(idx, list.length - 1) ? "w-5 bg-primary" : "w-1.5 bg-outline-variant"
                      }`}
                      aria-hidden
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setIdx((i) => (i + 1) % list.length)}
                    className="ml-2 font-label-sm text-label-sm text-primary min-h-11 px-2 active:scale-95 transition-transform"
                  >
                    Next
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => void takeAction(current)}
                disabled={acting !== null}
                className="w-full min-h-11 py-4 bg-[#DA532C] text-white rounded-xl font-label-sm text-body-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
              >
                {acting === "act" ? "Working…" : "Take Action"}
                <Icon name="arrow_forward" />
              </button>
              <button
                type="button"
                onClick={() => void dismiss(current)}
                disabled={acting !== null}
                className="w-full min-h-11 py-4 bg-transparent text-on-surface-variant rounded-xl font-label-sm text-body-md hover:bg-white/5 transition-all disabled:opacity-60"
              >
                {acting === "dismiss" ? "Dismissing…" : "Dismiss"}
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
