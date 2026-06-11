"use client";

import { useCallback, useEffect, useState } from "react";

type Envelope<T> = { ok: true; data: T } | { ok: false; error: string };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!body.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body.data;
}

export function useApi<T>(path: string | null, opts?: { refreshMs?: number }) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);

  const load = useCallback(
    async (silent = false) => {
      if (!path) return;
      if (!silent) setLoading(true);
      try {
        const d = await api<T>(path);
        setData(d);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [path]
  );

  useEffect(() => {
    if (!path) return;
    void load();
  }, [path, load]);

  useEffect(() => {
    if (!path || !opts?.refreshMs) return;
    const id = setInterval(() => void load(true), opts.refreshMs);
    return () => clearInterval(id);
  }, [path, opts?.refreshMs, load]);

  return { data, error, loading, reload: load };
}

// ── Shared API types (mirror the server payloads) ──────────────────────────
export type Me = {
  user: {
    id: string;
    name: string;
    nameAr: string;
    membership: string;
    kycStatus: string;
    kycDueAt: string | null;
    locale: string;
  };
  totalMils: number;
  accounts: Account[];
  kyc: { step: number; status: string } | null;
  activeAlerts: number;
};

export type Account = {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS";
  numberMasked: string;
  iban: string;
  balanceMils: number;
  currency: string;
};

export type Txn = {
  id: string;
  type: "DEBIT" | "CREDIT";
  category: string;
  merchant: string;
  amountMils: number;
  note: string | null;
  createdAt: string;
  account?: { name: string; type: string };
};

export type GoldProduct = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  purity: string;
  weightGrams: number;
  imageUrl: string;
  inStock: boolean;
  stockQty: number;
  priceMils: number;
};

export type GoldOrder = {
  id: string;
  orderNo: string;
  qty: number;
  unitPriceMils: number;
  totalMils: number;
  fulfillment: "DELIVERY" | "VAULT";
  status: string;
  createdAt: string;
  product: { sku: string; weightGrams: number; brand: string; name: string; imageUrl: string };
  sourceAccount: { name: string };
};

export type ChatAction = {
  label: string;
  labelAr: string;
  kind: string;
  params?: Record<string, unknown>;
};

export type ChatMsg = {
  id: string;
  role: "user" | "rafiq";
  content: string;
  contentAr: string | null;
  actions: string | null;
  createdAt: string;
};

export type Insight = {
  id: string;
  kind: string;
  title: string;
  titleAr: string | null;
  body: string;
  bodyAr: string | null;
  dataJson: string;
  status: string;
};

export type CoachingData = {
  categories: { name: string; currentMils: number; previousMils: number }[];
  totalMils: number;
  goals: { id: string; name: string; targetMils: number; savedMils: number; monthlyMils: number }[];
};

export type TutorialKey = "GOLD_BUY" | "KYC_UPDATE" | "HUB_INVEST_TIP" | "HOME_AI_TIP" | "GOLD_SMART_TIP";
export type TutorialState = Record<TutorialKey, { step: number; dismissed: boolean; completed: boolean }>;
