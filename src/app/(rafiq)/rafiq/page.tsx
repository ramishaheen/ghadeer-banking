"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Orb } from "@/components/rafiq/Orb";
import { RafiqTopBar } from "@/components/rafiq/RafiqTopBar";
import { ErrorState, Skeleton } from "@/components/States";
import { useApi, type Insight, type Me } from "@/lib/client";
import { fmtJod, fmtJod2 } from "@/lib/format";

type Lang = "en" | "ar";
type Theme = "dark" | "light";

function timeOfDay(): { en: string; ar: string } {
  const h = new Date().getHours();
  if (h < 12) return { en: "morning", ar: "صباح الخير" };
  if (h < 18) return { en: "afternoon", ar: "مساء الخير" };
  return { en: "evening", ar: "مساء الخير" };
}

function arInsightClause(n: number): string {
  if (n === 0) return "لا توجد رؤى جديدة اليوم.";
  if (n === 1) return "لديك رؤية جديدة واحدة اليوم.";
  if (n === 2) return "لديك رؤيتان جديدتان اليوم.";
  if (n <= 10) return `لديك ${n} رؤى جديدة اليوم.`;
  return `لديك ${n} رؤية جديدة اليوم.`;
}

export default function RafiqHomePage() {
  const router = useRouter();
  const meQ = useApi<Me>("/api/me");
  const insQ = useApi<{ insights: Insight[] }>("/api/rafiq/insights");

  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const l = localStorage.getItem("rafiq-lang");
    if (l === "ar" || l === "en") setLang(l);
    const t = localStorage.getItem("rafiq-theme");
    if (t === "light" || t === "dark") setTheme(t);
  }, []);

  const toggleLang = () =>
    setLang((p) => {
      const n: Lang = p === "en" ? "ar" : "en";
      localStorage.setItem("rafiq-lang", n);
      return n;
    });

  const toggleTheme = () =>
    setTheme((p) => {
      const n: Theme = p === "dark" ? "light" : "dark";
      localStorage.setItem("rafiq-theme", n);
      return n;
    });

  const L = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const dark = theme === "dark";
  const card = dark ? "glass-panel" : "bg-surface-container-lowest border border-outline-variant shadow-sm";
  const chip = `flex items-center gap-2 min-h-11 px-4 py-2.5 rounded-full whitespace-nowrap active:scale-95 transition-all ${
    dark ? "bg-surface-container-high border border-white/5" : "bg-surface-container-lowest border border-outline-variant"
  }`;

  const me = meQ.data;
  const newInsights = (insQ.data?.insights ?? []).filter((i) => i.status === "NEW");
  const tod = timeOfDay();

  const topBar = (
    <div data-theme="rafiq" className="shrink-0">
      <RafiqTopBar
        back="/"
        status="Online"
        right={
          <>
            <button
              type="button"
              onClick={toggleLang}
              aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"}
              className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface font-label-sm text-[14px] font-bold hover:bg-surface-container-high active:scale-95 transition-all"
            >
              {lang === "en" ? "ع" : "EN"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              className="w-11 h-11 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container-high active:scale-95 transition-all"
            >
              <Icon name={dark ? "light_mode" : "dark_mode"} className="text-[20px]" />
            </button>
          </>
        }
      />
    </div>
  );

  if (meQ.loading || (insQ.loading && !insQ.data)) {
    return (
      <div data-theme={dark ? "rafiq" : "kinetic"} className="h-dvh flex flex-col bg-background text-on-surface relative">
        {topBar}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-container-padding pt-5 space-y-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (meQ.error || !me) {
    return (
      <div data-theme={dark ? "rafiq" : "kinetic"} className="h-dvh flex flex-col bg-background text-on-surface relative">
        {topBar}
        <ErrorState message={meQ.error ?? "Could not load your profile."} onRetry={() => void meQ.reload()} />
      </div>
    );
  }

  const firstName = me.user.name.split(" ")[0];
  const firstNameAr = me.user.nameAr.split(" ")[0];
  const n = newInsights.length;
  const enGreeting = insQ.error
    ? `Good ${tod.en}, ${firstName}.`
    : `Good ${tod.en}, ${firstName}. You have ${n} new insight${n === 1 ? "" : "s"} today.`;
  const arGreeting = insQ.error
    ? `${tod.ar} يا ${firstNameAr}.`
    : `${tod.ar} يا ${firstNameAr}. ${arInsightClause(n)}`;

  const checking = me.accounts.find((a) => a.type === "CHECKING");
  const savings = me.accounts.find((a) => a.type === "SAVINGS");
  const summaryAccounts = [checking, savings].filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <div data-theme={dark ? "rafiq" : "kinetic"} className="h-dvh flex flex-col bg-background text-on-surface relative">
      {topBar}

      <main
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="flex-1 overflow-y-auto hide-scrollbar px-container-padding pt-5 pb-32 space-y-6"
      >
        {/* Greeting card — rafiq gradient (dark) / soft light-orange gradient (light, design 25) */}
        <section
          className={`relative overflow-hidden rounded-2xl p-6 shadow-xl fade-up ${dark ? "rafiq-gradient" : ""}`}
          style={dark ? undefined : { background: "linear-gradient(135deg, #ff6b00 0%, #ff9e57 100%)" }}
        >
          <div className="relative z-10 space-y-2">
            {lang === "en" ? (
              <>
                <p className="font-body-md text-body-md text-white">{enGreeting}</p>
                <p className="font-body-md text-[14px] leading-6 text-white/85 text-right" dir="rtl">
                  {arGreeting}
                </p>
              </>
            ) : (
              <>
                <p className="font-body-md text-body-md text-white" dir="rtl">
                  {arGreeting}
                </p>
                <p className="font-body-md text-[14px] leading-6 text-white/85 text-left" dir="ltr">
                  {enGreeting}
                </p>
              </>
            )}
          </div>
          <div className="absolute -right-4 -bottom-8 opacity-20 rotate-12 pointer-events-none" aria-hidden>
            <Icon name="insights" className="text-[120px] text-white" />
          </div>
        </section>

        {/* Total balance summary with sparkline */}
        <section className={`relative overflow-hidden rounded-2xl p-6 ${card}`}>
          <div className="absolute bottom-0 left-0 w-full h-24 opacity-30 pointer-events-none" aria-hidden>
            <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="rafiq-home-spark" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#DA532C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#DA532C" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,80 Q50,70 100,85 T200,60 T300,75 T400,40" fill="none" stroke="#DA532C" strokeWidth="3" />
              <path d="M0,80 Q50,70 100,85 T200,60 T300,75 T400,40 V100 H0 Z" fill="url(#rafiq-home-spark)" />
            </svg>
          </div>
          <div className="relative z-10">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">
              {lang === "en" ? (
                <>
                  Total Balance / <span dir="rtl">الرصيد الإجمالي</span>
                </>
              ) : (
                <>
                  الرصيد الإجمالي / <span dir="ltr">Total Balance</span>
                </>
              )}
            </p>
            <h3 className="font-display-lg text-[34px] leading-[42px] font-bold text-on-surface mb-4">
              {fmtJod2(me.totalMils)}
            </h3>
            <div className={`grid grid-cols-2 gap-4 pt-4 border-t ${dark ? "border-white/10" : "border-outline-variant/60"}`}>
              {summaryAccounts.map((a) => (
                <div key={a.id}>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {a.type === "CHECKING" ? L("Checking", "جاري") : L("Savings", "توفير")}
                  </p>
                  <p className="font-body-lg text-body-lg text-on-surface">{fmtJod(a.balanceMils)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Proactive chips */}
        <section>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-3 px-1">
            {L("Quick Actions", "إجراءات سريعة")}
          </p>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            <Link href="/gold" className={chip}>
              <Icon name="monetization_on" className="text-tertiary text-[20px]" />
              <span className="font-label-sm text-label-sm text-on-surface">{L("Buy Gold", "شراء الذهب")}</span>
            </Link>
            <Link href="/rafiq/transfer" className={chip}>
              <Icon name="send" className="text-primary text-[20px]" />
              <span className="font-label-sm text-label-sm text-on-surface">{L("Transfer", "تحويل")}</span>
            </Link>
            <Link href="/rafiq/chat?prompt=Pay%20my%20bill" className={chip}>
              <Icon name="receipt_long" className="text-secondary text-[20px]" />
              <span className="font-label-sm text-label-sm text-on-surface">{L("Pay Bills", "دفع الفواتير")}</span>
            </Link>
          </div>
        </section>

        {/* Insights preview */}
        <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              {L("Today's Insights", "رؤى اليوم")}
            </p>
            <Link href="/rafiq/insights" className="font-label-sm text-label-sm text-primary min-h-11 flex items-center px-1">
              {L("View all", "عرض الكل")}
            </Link>
          </div>
          {insQ.error ? (
            <div className={`rounded-2xl p-4 flex items-center justify-between gap-3 ${card}`}>
              <p className="font-body-md text-[13px] text-error" role="alert">
                {L("Couldn't load insights.", "تعذر تحميل الرؤى.")}
              </p>
              <button
                type="button"
                onClick={() => void insQ.reload()}
                className="font-label-sm text-label-sm text-primary min-h-11 px-3 active:scale-95 transition-transform"
              >
                {L("Retry", "إعادة المحاولة")}
              </button>
            </div>
          ) : newInsights.length === 0 ? (
            <div className={`rounded-2xl p-4 flex items-center gap-3 ${card}`}>
              <Orb size={36} pulse={false} />
              <div className="min-w-0">
                <p className="font-body-lg text-[15px] font-semibold text-on-surface">{L("All caught up", "لا جديد")}</p>
                <p className="font-body-md text-[13px] leading-5 text-on-surface-variant">
                  {L(
                    "Rafiq will surface new insights as your activity changes.",
                    "سيعرض رفيق رؤى جديدة عندما يتغير نشاطك."
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-1 px-1">
              {newInsights.map((i) => (
                <Link
                  key={i.id}
                  href="/rafiq/insights"
                  className={`min-w-[250px] max-w-[250px] rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform ${card}`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon name="insights" filled className="text-primary text-[16px]" />
                      <p className="font-body-lg text-[15px] font-semibold text-on-surface truncate">
                        {lang === "ar" && i.titleAr ? i.titleAr : i.title}
                      </p>
                    </div>
                    <p className="font-body-md text-[13px] leading-5 text-on-surface-variant truncate">
                      {lang === "ar" && i.bodyAr ? i.bodyAr : i.body}
                    </p>
                  </div>
                  <Icon name={lang === "ar" ? "chevron_left" : "chevron_right"} className="text-outline shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick links */}
        <section className="grid grid-cols-3 gap-card-gap">
          {[
            { icon: "query_stats", label: L("Coaching", "تدريب"), href: "/rafiq/coaching" },
            { icon: "graphic_eq", label: L("Voice", "صوت"), href: "/rafiq/voice" },
            { icon: "chat_bubble", label: L("Chat", "محادثة"), href: "/rafiq/chat" },
          ].map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className={`rounded-2xl p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform ${card}`}
            >
              <div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center">
                <Icon name={q.icon} className="text-primary text-[20px]" />
              </div>
              <span className="font-label-sm text-label-sm text-on-surface">{q.label}</span>
            </Link>
          ))}
        </section>
      </main>

      {/* Floating Rafiq orb */}
      <div className="absolute bottom-8 right-5 z-50">
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-primary-container/25 blur-xl pointer-events-none" aria-hidden />
          <Orb size={56} onClick={() => router.push("/rafiq/chat")} label="Open Rafiq chat" />
        </div>
      </div>
    </div>
  );
}
