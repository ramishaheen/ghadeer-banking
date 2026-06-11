"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { Orb } from "@/components/rafiq/Orb";
import { RafiqTopBar } from "@/components/rafiq/RafiqTopBar";
import { Sheet } from "@/components/Sheet";
import { EmptyState, ErrorState, Skeleton } from "@/components/States";
import { api, useApi, type CoachingData, type Insight } from "@/lib/client";
import { fmtJod, fmtJod2, toMils } from "@/lib/format";

type Goal = CoachingData["goals"][number];
type GoalTipData = { goalId: string; extraMils: number; monthsSaved: number };

const CAT_ICONS: Record<string, string> = {
  Groceries: "shopping_cart",
  Dining: "restaurant",
  Subscriptions: "subscriptions",
  Utilities: "bolt",
  Bills: "receipt_long",
  Shopping: "shopping_bag",
  Transport: "directions_car",
};

const PROGRESS_GRADIENT = "linear-gradient(90deg, #DA532C 0%, #ffb5a0 100%)";

/** Progress bar that grows in after mount (per the designed entry animation). */
function GrowBar({ pct, heightClass = "h-3" }: { pct: number; heightClass?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 250);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className={`${heightClass} w-full bg-surface-container-high rounded-full overflow-hidden`}>
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${w}%`, background: PROGRESS_GRADIENT }}
      />
    </div>
  );
}

export default function RafiqCoachingPage() {
  const coachQ = useApi<CoachingData>("/api/rafiq/coaching");
  const insQ = useApi<{ insights: Insight[] }>("/api/rafiq/insights");

  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [boost, setBoost] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [boostError, setBoostError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [gName, setGName] = useState("");
  const [gTarget, setGTarget] = useState("");
  const [gMonthly, setGMonthly] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (coachQ.data) setGoals(coachQ.data.goals);
  }, [coachQ.data]);

  const goalTip = useMemo(() => {
    const tipInsight = (insQ.data?.insights ?? []).find((i) => i.kind === "GOAL_TIP");
    const list = goals ?? [];
    let goal: Goal | undefined;
    if (tipInsight) {
      try {
        const d = JSON.parse(tipInsight.dataJson) as GoalTipData;
        goal = list.find((g) => g.id === d.goalId);
      } catch {
        goal = undefined;
      }
    }
    goal ??= list.find((g) => g.monthlyMils > 0 && g.savedMils < g.targetMils);
    if (!goal) return null;
    if (tipInsight) return { goal, body: tipInsight.body };
    // Compute locally with real goal math.
    const remaining = goal.targetMils - goal.savedMils;
    if (remaining <= 0 || goal.monthlyMils <= 0) return null;
    const monthsNow = Math.ceil(remaining / goal.monthlyMils);
    const monthsFaster = Math.ceil(remaining / (goal.monthlyMils + 20_000));
    const saved = monthsNow - monthsFaster;
    if (saved < 1) return null;
    return {
      goal,
      body: `Great progress! Increasing your monthly contribution by JOD 20 will hit your goal ${saved} month${saved > 1 ? "s" : ""} early.`,
    };
  }, [insQ.data, goals]);

  const boostGoal = async (goal: Goal) => {
    if (boost === "pending" || boost === "done") return;
    setBoost("pending");
    setBoostError(null);
    const previous = goal.monthlyMils;
    const next = previous + 20_000;
    // Optimistic update
    setGoals((gs) => (gs ?? []).map((x) => (x.id === goal.id ? { ...x, monthlyMils: next } : x)));
    try {
      await api(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ monthlyMils: next }),
      });
      setBoost("done");
    } catch (e) {
      setGoals((gs) => (gs ?? []).map((x) => (x.id === goal.id ? { ...x, monthlyMils: previous } : x)));
      setBoost("error");
      setBoostError(e instanceof Error ? e.message : "Couldn't update your goal.");
    }
  };

  const createGoal = async (e: FormEvent) => {
    e.preventDefault();
    const name = gName.trim();
    const target = Number(gTarget);
    const monthly = gMonthly.trim() === "" ? 0 : Number(gMonthly);
    if (!name) {
      setCreateError("Give your goal a name.");
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setCreateError("Target must be greater than zero.");
      return;
    }
    if (!Number.isFinite(monthly) || monthly < 0) {
      setCreateError("Monthly contribution can't be negative.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await api("/api/goals", {
        method: "POST",
        body: JSON.stringify({ name, targetMils: toMils(target), monthlyMils: toMils(monthly) }),
      });
      setSheetOpen(false);
      setGName("");
      setGTarget("");
      setGMonthly("");
      await coachQ.reload();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Couldn't create the goal.");
    } finally {
      setCreating(false);
    }
  };

  const data = coachQ.data;

  return (
    <div className="h-dvh flex flex-col relative">
      <RafiqTopBar back="/rafiq" status="Online" />

      {coachQ.loading && !data ? (
        <div className="flex-1 overflow-y-auto hide-scrollbar px-container-padding pt-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      ) : coachQ.error || !data ? (
        <ErrorState message={coachQ.error ?? "Couldn't load your coaching data."} onRetry={() => void coachQ.reload()} />
      ) : (
        <main className="flex-1 overflow-y-auto hide-scrollbar px-container-padding pt-6 pb-12 space-y-6">
          {/* Title */}
          <section className="space-y-1 fade-up">
            <h1 className="font-headline-md text-headline-md-mobile text-on-surface">Financial Coaching</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Your monthly financial trajectory · <span dir="rtl">مسارك المالي الشهري</span>
            </p>
          </section>

          {/* Monthly spending headline */}
          <section className="glass-panel rounded-xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-label-sm text-label-sm text-outline uppercase">Monthly Spending</p>
                <h2 className="font-headline-md text-headline-md text-primary">{fmtJod2(data.totalMils)}</h2>
              </div>
              <div className="bg-primary-container/20 p-2 rounded-lg">
                <Icon name="trending_up" className="text-primary" />
              </div>
            </div>
            <div className="h-16 w-full flex items-end gap-1" aria-hidden>
              {[30, 45, 40, 60, 55, 80, 90].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary rounded-t-sm"
                  style={{ height: `${h}%`, opacity: 0.18 + i * 0.12 }}
                />
              ))}
            </div>
          </section>

          {/* Category breakdown */}
          <section className="space-y-3">
            <h2 className="font-label-sm text-label-sm uppercase text-on-surface-variant px-1">Category Breakdown</h2>
            {data.categories.length === 0 ? (
              <div className="glass-panel rounded-xl p-5 flex items-center gap-3">
                <Icon name="receipt_long" className="text-outline" />
                <p className="font-body-md text-[14px] text-on-surface-variant">No spending recorded this month yet.</p>
              </div>
            ) : (
              data.categories.map((c) => {
                const ratio = c.previousMils > 0 ? c.currentMils / c.previousMils : 1;
                const pct =
                  c.previousMils > 0 ? Math.round(((c.currentMils - c.previousMils) / c.previousMils) * 100) : null;
                const down = pct !== null && pct < 0;
                return (
                  <div key={c.name} className="glass-panel rounded-xl p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                      <Icon name={CAT_ICONS[c.name] ?? "category"} className="text-primary text-[20px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2 mb-1.5">
                        <p className="font-body-lg text-[15px] font-semibold text-on-surface truncate">{c.name}</p>
                        <p className="font-headline-md text-[17px] text-on-surface shrink-0">{fmtJod(c.currentMils)}</p>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(4, Math.round(ratio * 100)))}%`,
                            background: PROGRESS_GRADIENT,
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        <p className="text-[11px] text-outline font-label-sm">vs {fmtJod(c.previousMils)} last month</p>
                        {pct !== null ? (
                          <span
                            className={`flex items-center gap-0.5 text-[11px] font-label-sm px-2 py-0.5 rounded-full ${
                              down ? "bg-brand-amber/15 text-brand-amber" : "bg-error-container/40 text-error"
                            }`}
                          >
                            <Icon name={down ? "arrow_downward" : "arrow_upward"} className="text-[12px]" />
                            {Math.abs(pct)}%
                          </span>
                        ) : (
                          <span className="text-[11px] font-label-sm text-outline px-2 py-0.5 rounded-full bg-surface-container-high">
                            new
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Savings goals */}
          <section className="space-y-3">
            <h2 className="font-label-sm text-label-sm uppercase text-on-surface-variant px-1">Savings Goals</h2>
            {(goals ?? []).length === 0 ? (
              <EmptyState
                icon="flag"
                title="No goals yet"
                body="Set a savings goal and Rafiq will coach you toward it."
                action={{ label: "Set a New Goal", onClick: () => setSheetOpen(true) }}
              />
            ) : (
              (goals ?? []).map((g) => {
                const pct = g.targetMils > 0 ? Math.min(100, Math.round((g.savedMils / g.targetMils) * 100)) : 0;
                return (
                  <div key={g.id} className="glass-panel rounded-xl p-6 space-y-4 border-l-4 border-l-primary">
                    <div className="flex justify-between items-end gap-3">
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-body-lg text-body-lg font-semibold text-on-surface truncate">{g.name}</h3>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          {fmtJod(g.savedMils)} / {fmtJod(g.targetMils)}
                        </p>
                      </div>
                      <p className="font-display-lg-mobile text-display-lg-mobile text-primary shrink-0">{pct}%</p>
                    </div>
                    <GrowBar pct={pct} />
                    <p className="font-label-sm text-[12px] text-outline">
                      {fmtJod(g.monthlyMils)} / month contribution
                    </p>
                  </div>
                );
              })
            )}
          </section>

          {/* Rafiq tip bubble */}
          {goalTip && (
            <section className="glass-panel rounded-2xl rounded-tl-none p-6 space-y-4 border border-primary/20">
              <div className="flex items-center gap-3">
                <Orb size={26} pulse={false} />
                <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-widest">
                  Rafiq Assistant
                </span>
              </div>
              <p className="font-body-lg text-body-lg text-on-surface leading-relaxed">{goalTip.body}</p>
              {boostError && (
                <p className="text-error font-label-sm text-label-sm" role="alert">
                  {boostError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void boostGoal(goalTip.goal)}
                disabled={boost === "pending" || boost === "done"}
                className={`w-full min-h-11 py-4 rounded-full font-label-sm text-label-sm flex items-center justify-center gap-2 active:scale-95 transition-transform ${
                  boost === "done" ? "bg-tertiary/20 text-tertiary" : "bg-primary-container text-white"
                } disabled:opacity-90`}
              >
                {boost === "done" ? (
                  <>
                    <Icon name="check" className="text-[18px]" />
                    Added JOD 20/month
                  </>
                ) : boost === "pending" ? (
                  "Updating…"
                ) : (
                  "+ JOD 20/month"
                )}
              </button>
            </section>
          )}

          {/* Set a new goal */}
          {(goals ?? []).length > 0 && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="w-full min-h-11 bg-primary-container text-on-primary-container py-4 px-6 rounded-full font-label-sm text-label-sm flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              Set a New Goal
              <Icon name="arrow_forward" className="text-sm" />
            </button>
          )}
        </main>
      )}

      {/* New goal sheet */}
      <Sheet open={sheetOpen} onClose={() => !creating && setSheetOpen(false)}>
        <form onSubmit={(e) => void createGoal(e)} className="px-container-padding pt-2 pb-10 space-y-5">
          <div className="space-y-1">
            <h2 className="font-headline-md text-headline-md-mobile text-on-surface">Set a New Goal</h2>
            <p className="font-body-md text-[14px] text-on-surface-variant">
              Rafiq will track it and coach your contributions.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="goal-name" className="font-label-sm text-[11px] uppercase tracking-widest text-outline">
              Goal name
            </label>
            <input
              id="goal-name"
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              maxLength={80}
              placeholder="e.g. New Car"
              className="w-full min-h-11 bg-surface-container-high/60 border border-white/10 rounded-xl px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline outline-none focus:border-primary-container/60 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="goal-target" className="font-label-sm text-[11px] uppercase tracking-widest text-outline">
              Target (JOD)
            </label>
            <input
              id="goal-target"
              inputMode="decimal"
              value={gTarget}
              onChange={(e) => {
                if (/^\d*\.?\d{0,3}$/.test(e.target.value)) setGTarget(e.target.value);
              }}
              placeholder="20000"
              className="w-full min-h-11 bg-surface-container-high/60 border border-white/10 rounded-xl px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline outline-none focus:border-primary-container/60 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="goal-monthly" className="font-label-sm text-[11px] uppercase tracking-widest text-outline">
              Monthly contribution (JOD)
            </label>
            <input
              id="goal-monthly"
              inputMode="decimal"
              value={gMonthly}
              onChange={(e) => {
                if (/^\d*\.?\d{0,3}$/.test(e.target.value)) setGMonthly(e.target.value);
              }}
              placeholder="250"
              className="w-full min-h-11 bg-surface-container-high/60 border border-white/10 rounded-xl px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline outline-none focus:border-primary-container/60 transition-colors"
            />
          </div>

          {createError && (
            <p className="text-error font-label-sm text-label-sm" role="alert">
              {createError}
            </p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full min-h-11 py-4 bg-primary-container text-white rounded-full font-label-sm text-label-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create Goal"}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
