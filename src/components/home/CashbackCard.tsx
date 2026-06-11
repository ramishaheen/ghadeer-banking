"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/client";
import { fmtJod } from "@/lib/format";

type WithdrawResult = {
  withdrawnMils: number;
  account: { id: string; balanceMils: number };
};

/**
 * Cashback in vault row (design 28) wired to POST /api/cashback/withdraw:
 * the button disables while pending, a 422 (empty vault) renders as an inline
 * error under the row, and success reloads balances via the parent.
 */
export function CashbackCard({
  cashbackMils,
  loading,
  onWithdrawn,
}: {
  cashbackMils: number | null;
  loading: boolean;
  onWithdrawn: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawnMils, setWithdrawnMils] = useState<number | null>(null);

  const withdraw = async () => {
    setPending(true);
    setError(null);
    setWithdrawnMils(null);
    try {
      const res = await api<WithdrawResult>("/api/cashback/withdraw", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setWithdrawnMils(res.withdrawnMils);
      onWithdrawn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-xl p-element-padding shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04)] border border-surface-container">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center">
            <Icon name="account_balance_wallet" className="text-primary font-bold" />
          </div>
          <div>
            <h3 className="font-headline-md text-[16px] text-on-surface">Cashback in vault</h3>
            {cashbackMils !== null ? (
              <p className="text-on-surface-variant font-label-sm text-label-sm">
                {fmtJod(cashbackMils)} available
              </p>
            ) : loading ? (
              <div className="h-4 w-28 mt-0.5 rounded skeleton" aria-hidden />
            ) : (
              <p className="text-on-surface-variant font-label-sm text-label-sm">Balance unavailable</p>
            )}
          </div>
        </div>
        <button
          onClick={() => void withdraw()}
          disabled={pending}
          className="px-4 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-full text-label-sm hover:bg-surface-container-highest transition-colors active:scale-95 disabled:opacity-60"
        >
          {pending ? "Withdrawing…" : "Withdraw"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-error font-label-sm text-label-sm" role="alert">
          {error}
        </p>
      )}
      {withdrawnMils !== null && !error && (
        <p className="mt-3 text-primary font-label-sm text-label-sm" role="status">
          {fmtJod(withdrawnMils)} moved to your checking account.
        </p>
      )}
    </section>
  );
}
