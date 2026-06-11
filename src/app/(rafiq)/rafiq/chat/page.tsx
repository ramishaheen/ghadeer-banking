"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Orb } from "@/components/rafiq/Orb";
import { RafiqTopBar } from "@/components/rafiq/RafiqTopBar";
import { ErrorState, Skeleton } from "@/components/States";
import { api, useApi, type ChatAction, type ChatMsg } from "@/lib/client";
import { fmtJod, fmtTime } from "@/lib/format";

type ActionResult = { status: "pending" | "success" | "error"; text: string };

const ACTION_ICONS: Record<string, string> = {
  view_report: "analytics",
  transfer_confirm: "arrow_forward",
  pay_bill: "payments",
  set_alert: "notifications_active",
  navigate: "arrow_outward",
};

function parseActions(raw: string | null): ChatAction[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as ChatAction[]) : [];
  } catch {
    return [];
  }
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ChatSkeleton() {
  return (
    <div className="flex-1 px-container-padding pt-6 space-y-5">
      <Skeleton className="h-12 w-2/3 rounded-2xl" />
      <Skeleton className="h-24 w-4/5 rounded-2xl" />
      <Skeleton className="h-12 w-1/2 rounded-2xl ml-auto" />
      <Skeleton className="h-20 w-3/4 rounded-2xl" />
    </div>
  );
}

function ChatScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatQ = useApi<{ messages: ChatMsg[] }>("/api/rafiq/chat");

  const [messages, setMessages] = useState<ChatMsg[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const promptSent = useRef(false);

  useEffect(() => {
    if (chatQ.data && messages === null) setMessages(chatQ.data.messages);
  }, [chatQ.data, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      setSendError(null);
      setSending(true);
      const temp: ChatMsg = {
        id: `local-${Date.now()}`,
        role: "user",
        content: text,
        contentAr: null,
        actions: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...(m ?? []), temp]);
      try {
        const res = await api<{ userMessage: ChatMsg; rafiqMessage: ChatMsg }>("/api/rafiq/chat", {
          method: "POST",
          body: JSON.stringify({ message: text }),
        });
        setMessages((m) => [...(m ?? []).filter((x) => x.id !== temp.id), res.userMessage, res.rafiqMessage]);
      } catch (e) {
        setMessages((m) => (m ?? []).filter((x) => x.id !== temp.id));
        setInput(text);
        setSendError(e instanceof Error ? e.message : "Couldn't reach Rafiq.");
      } finally {
        setSending(false);
      }
    },
    []
  );

  // ?prompt= — prefill + auto-send exactly once, after history has loaded.
  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt || promptSent.current || messages === null) return;
    promptSent.current = true;
    void send(prompt);
  }, [searchParams, messages, send]);

  const setResult = (key: string, r: ActionResult) => setActionResults((s) => ({ ...s, [key]: r }));

  const runPayBill = async (key: string, action: ChatAction) => {
    const p = action.params ?? {};
    setResult(key, { status: "pending", text: "Paying…" });
    try {
      const res = await api<{ account: { name: string; balanceMils: number } }>("/api/bills/pay", {
        method: "POST",
        body: JSON.stringify({ accountId: p.accountId, merchant: p.merchant, amountMils: p.amountMils }),
      });
      setResult(key, {
        status: "success",
        text: `Paid ${String(p.merchant)} — ${fmtJod(Number(p.amountMils))} · ${res.account.name} balance ${fmtJod(res.account.balanceMils)}`,
      });
    } catch (e) {
      setResult(key, { status: "error", text: e instanceof Error ? e.message : "Payment failed." });
    }
  };

  const runSetAlert = async (key: string, action: ChatAction) => {
    const p = action.params ?? {};
    setResult(key, { status: "pending", text: "Setting alert…" });
    try {
      await api("/api/alerts", {
        method: "POST",
        body: JSON.stringify({ thresholdMils: p.thresholdMils, direction: p.direction }),
      });
      setResult(key, {
        status: "success",
        text: `Alert set — ${String(p.direction).toLowerCase() === "below" ? "below" : "above"} ${fmtJod(Number(p.thresholdMils))}`,
      });
    } catch (e) {
      setResult(key, { status: "error", text: e instanceof Error ? e.message : "Couldn't set the alert." });
    }
  };

  const handleAction = (msg: ChatMsg, action: ChatAction, idx: number) => {
    const key = `${msg.id}:${idx}`;
    switch (action.kind) {
      case "quick_reply": {
        const m = action.params?.message;
        if (typeof m === "string") void send(m);
        break;
      }
      case "view_report": {
        const report = action.params?.report;
        void send(report === "subscriptions" ? "Show my subscriptions" : "Show my spending breakdown");
        break;
      }
      case "navigate": {
        const href = action.params?.href;
        if (typeof href === "string") router.push(href);
        break;
      }
      case "transfer_confirm": {
        const p = action.params ?? {};
        const qs = new URLSearchParams({
          from: String(p.fromAccountId ?? ""),
          to: String(p.toAccountId ?? ""),
          amount: String(p.amountMils ?? ""),
        });
        router.push(`/rafiq/transfer?${qs.toString()}`);
        break;
      }
      case "pay_bill":
        void runPayBill(key, action);
        break;
      case "set_alert":
        void runSetAlert(key, action);
        break;
    }
  };

  const initialLoading = chatQ.loading && messages === null;
  const initialError = chatQ.error && messages === null;

  return (
    <div className="h-dvh flex flex-col relative">
      <RafiqTopBar back="/rafiq" status="Online" />

      {initialLoading ? (
        <ChatSkeleton />
      ) : initialError ? (
        <div className="flex-1">
          <ErrorState message={chatQ.error ?? "Couldn't load the conversation."} onRetry={() => void chatQ.reload()} />
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto hide-scrollbar px-container-padding pt-4 pb-4 relative">
          <div className="space-y-6 flex flex-col">
            {(messages ?? []).length === 0 && !sending && (
              <div className="flex flex-col items-center text-center gap-3 py-12 fade-up">
                <Orb size={64} />
                <p className="font-headline-md text-headline-md-mobile text-on-surface">Talk to Rafiq</p>
                <p className="font-body-md text-[14px] leading-6 text-on-surface-variant max-w-[30ch]">
                  Ask about balances, transfers, bills, spending or gold — in English or Arabic.
                </p>
              </div>
            )}

            {(messages ?? []).map((m, i, arr) => {
              const prev = arr[i - 1];
              const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt);
              const actions = m.role === "rafiq" ? parseActions(m.actions) : [];
              return (
                <div key={m.id} className="flex flex-col space-y-6">
                  {showDay && (
                    <div className="flex justify-center">
                      <span className="font-label-sm text-label-sm text-outline px-4 py-1 bg-surface-container-low rounded-full">
                        {dayLabel(m.createdAt)}
                      </span>
                    </div>
                  )}

                  {m.role === "user" ? (
                    <div className="flex flex-col items-end w-full max-w-[85%] self-end fade-up">
                      <div className="rafiq-gradient text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-md">
                        <p className="font-body-md text-body-md">{m.content}</p>
                      </div>
                      <span className="text-[10px] text-outline mt-1 px-1">{fmtTime(m.createdAt)}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start w-full max-w-[90%] self-start fade-up">
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center shrink-0 mt-1">
                          <Orb size={18} pulse={false} />
                        </div>
                        <div className="glass-panel p-4 rounded-2xl rounded-tl-none space-y-3 min-w-0">
                          <p className="font-body-md text-body-md text-on-surface">{m.content}</p>
                          {actions.map((a, idx) => {
                            const key = `${m.id}:${idx}`;
                            const st = actionResults[key];
                            const ghost = a.kind === "quick_reply" || a.kind === "navigate";
                            if (st && st.status !== "error") {
                              return (
                                <div
                                  key={key}
                                  className={`flex items-center gap-1.5 text-[12px] font-label-sm px-3 py-2 rounded-full w-fit max-w-full ${
                                    st.status === "success" ? "bg-tertiary/15 text-tertiary" : "bg-surface-container-high text-on-surface-variant"
                                  }`}
                                >
                                  <Icon name={st.status === "success" ? "check_circle" : "progress_activity"} className="text-[14px]" />
                                  <span className="truncate">{st.text}</span>
                                </div>
                              );
                            }
                            return (
                              <div key={key} className="space-y-2">
                                <button
                                  type="button"
                                  onClick={() => handleAction(m, a, idx)}
                                  disabled={sending && (a.kind === "quick_reply" || a.kind === "view_report")}
                                  className={`w-full min-h-11 py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-label-sm text-label-sm active:scale-95 transition-transform disabled:opacity-50 ${
                                    ghost
                                      ? "bg-surface-container-high text-on-surface border border-white/10"
                                      : "bg-primary-container text-white"
                                  }`}
                                >
                                  {ACTION_ICONS[a.kind] && <Icon name={ACTION_ICONS[a.kind]} className="text-[18px]" />}
                                  {a.label}
                                </button>
                                {st?.status === "error" && (
                                  <p className="text-error font-label-sm text-[12px]" role="alert">
                                    {st.text}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <span className="text-[10px] text-outline mt-1 ml-10">Rafiq AI • {fmtTime(m.createdAt)}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {sending && (
              <div className="flex gap-3 self-start fade-up">
                <div className="w-7 h-7 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center shrink-0 mt-1">
                  <Orb size={18} pulse={false} />
                </div>
                <div className="glass-panel px-4 py-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="typing-dot w-2 h-2 rounded-full bg-on-surface-variant inline-block"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </main>
      )}

      {/* Bottom interaction area — quick chips + the Rafiq Bar */}
      <div className="shrink-0 bg-background/60 backdrop-blur-xl pb-safe">
        {sendError && (
          <p className="px-container-padding pt-2 text-error font-label-sm text-label-sm" role="alert">
            {sendError}
          </p>
        )}
        <div className="flex gap-3 px-container-padding pt-3 pb-2 overflow-x-auto hide-scrollbar">
          {["Transfer", "Pay Bill", "Check Balance"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => void send(t)}
              disabled={sending}
              className="whitespace-nowrap flex items-center gap-2 min-h-11 px-5 py-2.5 bg-surface-container-high border border-white/5 rounded-full font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors active:scale-95 disabled:opacity-50"
            >
              <span className="w-1.5 h-1.5 bg-primary rounded-full" aria-hidden />
              {t}
            </button>
          ))}
        </div>
        <div className="px-container-padding pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = input;
              if (!t.trim() || sending) return;
              setInput("");
              void send(t);
            }}
            className="flex items-center gap-2 glass-panel rafiq-input-glow rounded-full p-1.5"
          >
            <button
              type="button"
              aria-label="Voice command"
              onClick={() => router.push("/rafiq/voice")}
              className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors shrink-0"
            >
              <Icon name="mic" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              dir={/[؀-ۿ]/.test(input) ? "rtl" : "ltr"}
              placeholder="Talk to Rafiq..."
              aria-label="Message Rafiq"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-on-surface font-body-md text-body-md placeholder:text-outline py-2 px-1"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="w-11 h-11 rounded-full bg-primary-container text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 shrink-0"
            >
              <Icon name="arrow_upward" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RafiqChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh flex flex-col">
          <RafiqTopBar back="/rafiq" status="Online" />
          <ChatSkeleton />
        </div>
      }
    >
      <ChatScreen />
    </Suspense>
  );
}
