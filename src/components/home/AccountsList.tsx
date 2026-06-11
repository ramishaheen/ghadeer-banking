"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { EmptyState } from "@/components/States";
import type { Account } from "@/lib/client";
import { fmtJod } from "@/lib/format";

function subtitle(acc: Account) {
  return `${acc.type === "CHECKING" ? "Main Account" : "Savings"} • ${acc.numberMasked}`;
}

/**
 * Accounts section (design 28): one card per account with Transfer / Show /
 * IBAN actions. "See all" toggles between the first account and the full list;
 * IBAN opens the shared bottom sheet with a copy-to-clipboard action.
 */
export function AccountsList({
  accounts,
  shownMap,
  onToggleAccount,
}: {
  accounts: Account[];
  shownMap: Record<string, boolean>;
  onToggleAccount: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [ibanFor, setIbanFor] = useState<Account | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const visible = expanded ? accounts : accounts.slice(0, 1);

  const openIban = (acc: Account) => {
    setCopied(false);
    setCopyError(null);
    setIbanFor(acc);
  };

  const copyIban = async () => {
    if (!ibanFor) return;
    try {
      await navigator.clipboard.writeText(ibanFor.iban);
      setCopyError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError("Couldn't copy automatically — long-press the IBAN to copy it.");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md-mobile text-on-surface">Accounts</h2>
        {accounts.length > 1 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-primary font-bold text-label-sm min-h-11 px-3 -mx-3 -my-3 active:scale-95 transition-transform"
          >
            {expanded ? "Show less" : "See all"}
          </button>
        )}
      </div>

      {accounts.length === 0 && (
        <EmptyState
          icon="account_balance_wallet"
          title="No accounts yet"
          body="Your accounts will appear here once they are opened."
        />
      )}

      {visible.map((acc) => {
        const shown = !!shownMap[acc.id];
        return (
          <div
            key={acc.id}
            className="bg-surface-container-lowest rounded-xl p-element-padding shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04)] border border-surface-container space-y-5"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center overflow-hidden">
                  <Icon
                    name={acc.type === "SAVINGS" ? "savings" : "payments"}
                    className="text-on-secondary-container"
                  />
                </div>
                <div>
                  <h4 className="font-body-lg text-body-lg text-on-surface">{acc.name}</h4>
                  <p className="text-on-surface-variant font-label-sm text-label-sm">{subtitle(acc)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-headline-md text-headline-md-mobile text-on-surface">
                  {shown ? fmtJod(acc.balanceMils) : "JOD ••••"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/rafiq/transfer?from=${acc.id}`}
                className="flex-1 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-label-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Icon name="swap_horiz" className="text-[18px]" />
                Transfer
              </Link>
              <button
                onClick={() => onToggleAccount(acc.id)}
                className="flex-1 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-lg text-label-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Icon name={shown ? "visibility_off" : "visibility"} className="text-[18px]" />
                {shown ? "Hide" : "Show"}
              </button>
              <button
                onClick={() => openIban(acc)}
                className="flex-1 py-2.5 bg-surface-container-high text-on-surface font-bold rounded-lg text-label-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Icon name="info" className="text-[18px]" />
                IBAN
              </button>
            </div>
          </div>
        );
      })}

      {/* IBAN bottom sheet */}
      <Sheet open={!!ibanFor} onClose={() => setIbanFor(null)} heightClass="max-h-[60dvh]">
        {ibanFor && (
          <div className="px-element-padding pt-3 pb-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                <Icon
                  name={ibanFor.type === "SAVINGS" ? "savings" : "payments"}
                  className="text-on-secondary-container"
                />
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md-mobile text-on-surface">{ibanFor.name}</h3>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{subtitle(ibanFor)}</p>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Use this IBAN to receive transfers into this account.
            </p>
            <div className="bg-surface-container-low border border-surface-container rounded-xl p-4 flex items-center justify-between gap-3">
              <p className="font-body-lg text-body-lg text-on-surface tracking-wide">{ibanFor.iban}</p>
              <button
                aria-label="Copy IBAN to clipboard"
                onClick={() => void copyIban()}
                className="w-11 h-11 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center active:scale-95 transition-transform"
              >
                <Icon name={copied ? "check" : "content_copy"} className="text-[20px]" />
              </button>
            </div>
            {copied && (
              <p className="text-primary font-label-sm text-label-sm" role="status">
                Copied to clipboard
              </p>
            )}
            {copyError && (
              <p className="text-error font-label-sm text-label-sm" role="alert">
                {copyError}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </section>
  );
}
