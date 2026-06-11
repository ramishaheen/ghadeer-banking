"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { FaceIdScan } from "@/components/rafiq/FaceIdScan";
import { RafiqTopBar } from "@/components/rafiq/RafiqTopBar";
import { ErrorState, Skeleton } from "@/components/States";
import { api, useApi, type Account, type Me } from "@/lib/client";
import { fmtJod, fmtJodPlain, toMils } from "@/lib/format";

type TransferResponse = {
  transactionId: string;
  from: { id: string; name: string; balanceMils: number };
  to: { id: string; name: string; balanceMils: number };
};

type SuccessState = TransferResponse & { amountMils: number };

const trimAmount = (jod: number) => String(Number(jod.toFixed(3)));

function AccountPick({
  account,
  selected,
  onPick,
}: {
  account: Account;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={`flex-1 min-w-0 min-h-11 rounded-xl px-3 py-2.5 border text-left transition-all active:scale-[0.98] ${
        selected ? "border-primary-container bg-primary-container/15" : "border-white/10 bg-surface-container-high/60"
      }`}
    >
      <span className="block font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
        {account.type === "CHECKING" ? "Checking" : "Savings"}
      </span>
      <span className="block font-body-lg text-[15px] text-on-surface truncate">{account.name}</span>
    </button>
  );
}

function TransferScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const meQ = useApi<Me>("/api/me");

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [faceId, setFaceId] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const initRef = useRef(false);

  // Initialise selection from query params (?from&to&amount in mils) or defaults.
  useEffect(() => {
    if (!meQ.data || initRef.current) return;
    initRef.current = true;
    const accs = meQ.data.accounts;
    const qFrom = params.get("from");
    const qTo = params.get("to");
    const qAmount = params.get("amount");
    const from = accs.find((a) => a.id === qFrom) ?? accs.find((a) => a.type === "CHECKING") ?? accs[0];
    const to =
      accs.find((a) => a.id === qTo && a.id !== from?.id) ??
      accs.find((a) => a.type === "SAVINGS" && a.id !== from?.id) ??
      accs.find((a) => a.id !== from?.id);
    setFromId(from?.id ?? null);
    setToId(to?.id ?? null);
    if (qAmount && /^\d+$/.test(qAmount)) setAmount(trimAmount(Number(qAmount) / 1000));
  }, [meQ.data, params]);

  if (meQ.loading) {
    return (
      <div className="h-dvh flex flex-col relative">
        <RafiqTopBar back="/rafiq" status="Online" />
        <div className="flex-1 px-container-padding pt-6 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (meQ.error || !meQ.data) {
    return (
      <div className="h-dvh flex flex-col relative">
        <RafiqTopBar back="/rafiq" status="Online" />
        <ErrorState message={meQ.error ?? "Couldn't load your accounts."} onRetry={() => void meQ.reload()} />
      </div>
    );
  }

  const accounts = meQ.data.accounts;
  const fromAcc = accounts.find((a) => a.id === fromId) ?? null;
  const toAcc = accounts.find((a) => a.id === toId) ?? null;

  const validate = (): string | null => {
    if (!fromAcc || !toAcc) return "Choose both accounts.";
    if (fromAcc.id === toAcc.id) return "Source and destination accounts must differ.";
    const n = Number(amount);
    if (!amount || !Number.isFinite(n) || n <= 0) return "Enter an amount greater than zero.";
    if (toMils(n) > fromAcc.balanceMils) return `Insufficient funds in ${fromAcc.name}.`;
    return null;
  };
  const validationError = validate();
  const shownError = formError ?? (touched ? validationError : null);

  const pickFrom = (id: string) => {
    setFormError(null);
    if (id === toId) setToId(fromId);
    setFromId(id);
  };
  const pickTo = (id: string) => {
    setFormError(null);
    if (id === fromId) setFromId(toId);
    setToId(id);
  };

  const startTransfer = () => {
    setTouched(true);
    setFormError(null);
    if (validate()) return;
    setFaceId(true);
  };

  const execute = async () => {
    if (executing || !fromAcc || !toAcc) return;
    const amountMils = toMils(Number(amount));
    setExecuting(true);
    try {
      const res = await api<TransferResponse>("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          amountMils,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      setSuccess({ ...res, amountMils });
      setFaceId(false);
    } catch (e) {
      setFaceId(false);
      setFormError(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      setExecuting(false);
    }
  };

  const resetForm = () => {
    setSuccess(null);
    setAmount("");
    setNote("");
    setTouched(false);
    setFormError(null);
    void meQ.reload(true);
  };

  return (
    <div className="h-dvh flex flex-col relative">
      <RafiqTopBar back="/rafiq" status="Online" />

      {success ? (
        /* ── Success state (design 24) ─────────────────────────────────── */
        <main className="flex-1 overflow-y-auto hide-scrollbar px-container-padding pt-10 pb-10 flex flex-col items-center fade-up">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-tertiary/20 animate-ping" aria-hidden />
            <div className="w-24 h-24 rounded-full bg-tertiary flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(255,185,85,0.4)]">
              <Icon name="check" className="text-on-tertiary text-5xl" style={{ fontVariationSettings: "'wght' 700" }} />
            </div>
          </div>
          <h2 className="font-headline-md text-headline-md-mobile text-primary mb-1">Transfer Complete</h2>
          <p className="text-on-surface-variant font-label-sm text-label-sm mb-8">
            Rafiq has moved your funds successfully.
          </p>

          <div className="w-full glass-panel rounded-xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-20" aria-hidden>
              <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                <path d="M0,80 Q50,70 100,50 T200,60 T300,20 T400,40" fill="none" stroke="#DA532C" strokeWidth="2" />
              </svg>
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <span className="block text-outline font-label-sm uppercase tracking-widest text-[10px]">From</span>
                  <span className="block font-headline-md text-on-surface text-lg truncate">{success.from.name}</span>
                  <span className="block text-[12px] text-on-surface-variant">
                    New balance {fmtJod(success.from.balanceMils)}
                  </span>
                </div>
                <Icon name="account_balance_wallet" className="text-outline shrink-0" />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                  <Icon name="arrow_downward" className="text-primary text-sm" />
                </div>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <span className="block text-outline font-label-sm uppercase tracking-widest text-[10px]">To</span>
                  <span className="block font-headline-md text-on-surface text-lg truncate">{success.to.name}</span>
                  <span className="block text-[12px] text-on-surface-variant">
                    New balance {fmtJod(success.to.balanceMils)}
                  </span>
                </div>
                <Icon name="savings" className="text-tertiary shrink-0" />
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 text-center">
                <span className="block text-outline font-label-sm uppercase mb-2">Amount Transferred</span>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-display-lg text-2xl text-on-surface">JOD</span>
                  <span className="font-display-lg text-5xl tracking-tight text-on-surface">
                    {fmtJodPlain(success.amountMils)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-on-surface-variant bg-surface-container-high px-4 py-3 rounded-full opacity-80">
            <Icon name="face" className="text-[18px]" />
            <span className="font-label-sm text-label-sm">Verified via FaceID</span>
          </div>

          <div className="w-full mt-8 flex gap-4">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 min-h-11 py-4 glass-panel rounded-lg font-label-sm text-label-sm text-primary hover:bg-white/5 transition-colors active:scale-95"
            >
              Make another
            </button>
            <button
              type="button"
              onClick={() => router.push("/rafiq")}
              className="flex-1 min-h-11 py-4 bg-primary-container text-on-primary-container rounded-lg font-label-sm text-label-sm hover:opacity-90 transition-opacity active:scale-95"
            >
              Done
            </button>
          </div>
        </main>
      ) : (
        /* ── Structured transfer form ──────────────────────────────────── */
        <main className="flex-1 overflow-y-auto hide-scrollbar px-container-padding pt-6 pb-10 space-y-6">
          <section className="space-y-1">
            <h1 className="font-headline-md text-headline-md-mobile text-on-surface">Transfer</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Move money between your accounts · <span dir="rtl">تحويل بين حساباتك</span>
            </p>
          </section>

          <section className="glass-panel rounded-2xl p-5 space-y-5">
            <div className="space-y-2">
              <p className="font-label-sm text-[11px] uppercase tracking-widest text-outline">From</p>
              <div className="flex gap-3">
                {accounts.map((a) => (
                  <AccountPick key={a.id} account={a} selected={a.id === fromId} onPick={() => pickFrom(a.id)} />
                ))}
              </div>
              {fromAcc && (
                <p className="text-[12px] text-on-surface-variant font-label-sm">
                  Available <span className="text-on-surface">{fmtJod(fromAcc.balanceMils)}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-3" aria-hidden>
              <div className="flex-1 h-px bg-white/10" />
              <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center">
                <Icon name="arrow_downward" className="text-primary text-sm" />
              </div>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="space-y-2">
              <p className="font-label-sm text-[11px] uppercase tracking-widest text-outline">To</p>
              <div className="flex gap-3">
                {accounts.map((a) => (
                  <AccountPick key={a.id} account={a} selected={a.id === toId} onPick={() => pickTo(a.id)} />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="transfer-amount" className="font-label-sm text-[11px] uppercase tracking-widest text-outline">
                Amount
              </label>
              <div className="flex items-baseline gap-2 border-b border-white/10 focus-within:border-primary-container transition-colors pb-2 mt-1">
                <span className="font-display-lg text-xl text-on-surface-variant">JOD</span>
                <input
                  id="transfer-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d{0,3}$/.test(v)) {
                      setAmount(v);
                      setFormError(null);
                    }
                  }}
                  onBlur={() => setTouched(true)}
                  placeholder="0.000"
                  className="flex-1 min-w-0 bg-transparent outline-none border-none font-display-lg text-[40px] leading-[48px] font-bold text-on-surface placeholder:text-outline/50"
                />
              </div>
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Note (optional)"
              aria-label="Transfer note"
              className="w-full min-h-11 bg-surface-container-high/60 border border-white/10 rounded-xl px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline outline-none focus:border-primary-container/60 transition-colors"
            />

            {shownError && (
              <p className="text-error font-label-sm text-label-sm" role="alert">
                {shownError}
              </p>
            )}

            <button
              type="button"
              onClick={startTransfer}
              disabled={executing}
              className="w-full min-h-11 py-4 rafiq-gradient text-white rounded-xl font-label-sm text-body-md flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-60 shadow-[0_0_24px_rgba(218,83,44,0.3)]"
            >
              Transfer
              <Icon name="arrow_forward" />
            </button>
          </section>
        </main>
      )}

      <FaceIdScan
        open={faceId}
        busy={executing}
        label="FaceID to Confirm"
        sublabel={
          fromAcc && toAcc
            ? `${fmtJod(toMils(Number(amount) || 0))} · ${fromAcc.name} → ${toAcc.name}`
            : "Hold still — confirming it's you."
        }
        onCancel={() => {
          if (!executing) setFaceId(false);
        }}
        onScanned={() => void execute()}
      />
    </div>
  );
}

export default function RafiqTransferPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh flex flex-col">
          <RafiqTopBar back="/rafiq" status="Online" />
          <div className="flex-1 px-container-padding pt-6 space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <TransferScreen />
    </Suspense>
  );
}
