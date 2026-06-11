"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { FaceIdScan } from "@/components/rafiq/FaceIdScan";
import { Orb } from "@/components/rafiq/Orb";
import { api } from "@/lib/client";
import { fmtJod } from "@/lib/format";

/* ── Web Speech API minimal typings (not in lib.dom for all targets) ─────── */
type SpeechAlt = { transcript: string };
type SpeechResult = { isFinal: boolean; length: number; [index: number]: SpeechAlt };
type SpeechResultEvent = { resultIndex: number; results: { length: number; [index: number]: SpeechResult } };
type SpeechErrorEvent = { error: string };
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

/* ── /api/rafiq/command response shape ───────────────────────────────────── */
type TransferConfirm = {
  kind: "transfer";
  fromAccountId: string;
  fromName: string;
  toAccountId: string;
  toName: string;
  amountMils: number;
};
type NavigateConfirm = { kind: "navigate"; href: string };
type CommandRes = { intent: string; speech: string; confirm: TransferConfirm | NavigateConfirm | null };

const HINTS = ["Transfer 500 JOD to my savings account", "What's my balance?"];

export default function RafiqVoicePage() {
  const router = useRouter();

  const [supported, setSupported] = useState(true);
  const [fallback, setFallback] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<"en-US" | "ar-JO">("en-US");
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<CommandRes | null>(null);
  const [cmdError, setCmdError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  const [faceId, setFaceId] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const recogRef = useRef<Recognition | null>(null);
  const busyRef = useRef(false);
  const handleRef = useRef<(t: string) => void>(() => undefined);

  const handleTranscript = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      recogRef.current?.stop();
      setListening(false);
      setFinalText(text);
      setInterim("");
      setProcessing(true);
      setCmdError(null);
      setResult(null);
      setDone(null);
      setExecError(null);
      try {
        const res = await api<CommandRes>("/api/rafiq/command", {
          method: "POST",
          body: JSON.stringify({ transcript: text }),
        });
        if (res.confirm && res.confirm.kind === "navigate") {
          router.push(res.confirm.href);
          return;
        }
        setResult(res);
      } catch (e) {
        setCmdError(e instanceof Error ? e.message : "Couldn't process that command.");
      } finally {
        setProcessing(false);
        busyRef.current = false;
      }
    },
    [router]
  );

  useEffect(() => {
    handleRef.current = (t: string) => void handleTranscript(t);
  }, [handleTranscript]);

  const startListening = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      setFallback(true);
      return;
    }
    try {
      recogRef.current?.abort();
      const r = new Ctor();
      r.lang = speechLang;
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let interimStr = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const text = res[0]?.transcript ?? "";
          if (res.isFinal) handleRef.current(text);
          else interimStr += text;
        }
        if (interimStr) setInterim(interimStr);
      };
      r.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
          setFallback(true);
          setListening(false);
        }
      };
      r.onend = () => setListening(false);
      r.start();
      recogRef.current = r;
      setListening(true);
    } catch {
      setSupported(false);
      setFallback(true);
    }
  }, [speechLang]);

  const stopListening = () => {
    recogRef.current?.stop();
    setListening(false);
  };

  // Default recognition language from the stored Rafiq language preference.
  useEffect(() => {
    if (localStorage.getItem("rafiq-lang") === "ar") setSpeechLang("ar-JO");
  }, []);

  // Start listening on mount and whenever the language changes.
  useEffect(() => {
    startListening();
    return () => recogRef.current?.abort();
  }, [startListening]);

  const executeTransfer = async () => {
    const c = result?.confirm;
    if (!c || c.kind !== "transfer" || executing) return;
    setExecuting(true);
    try {
      await api("/api/transfers", {
        method: "POST",
        body: JSON.stringify({ fromAccountId: c.fromAccountId, toAccountId: c.toAccountId, amountMils: c.amountMils }),
      });
      setDone(`Done — ${fmtJod(c.amountMils)} moved from ${c.fromName} to ${c.toName}.`);
      setResult(null);
      setFaceId(false);
    } catch (e) {
      setFaceId(false);
      setExecError(e instanceof Error ? e.message : "Transfer failed.");
    } finally {
      setExecuting(false);
    }
  };

  const resetForNext = () => {
    setResult(null);
    setDone(null);
    setFinalText("");
    setInterim("");
    setCmdError(null);
    setExecError(null);
    if (!fallback) startListening();
  };

  const displayText = interim || finalText;
  const waveActive = listening || processing;
  const transferConfirm = result?.confirm && result.confirm.kind === "transfer" ? result.confirm : null;

  return (
    <div className="relative h-dvh flex flex-col overflow-hidden">
      {/* Dimmed mock banking backdrop (design 23) */}
      <div className="fixed inset-0 z-0 opacity-20 blur-sm pointer-events-none" aria-hidden>
        <div className="px-container-padding pt-24 space-y-6 max-w-[420px] mx-auto">
          <div className="h-48 rounded-xl bg-surface-container-high p-4">
            <div className="w-32 h-6 bg-surface-variant rounded mb-4" />
            <div className="w-48 h-10 bg-surface-variant rounded" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 rounded-xl bg-surface-container-low" />
            <div className="h-24 rounded-xl bg-surface-container-low" />
          </div>
          <div className="space-y-3">
            <div className="h-16 rounded-lg bg-surface-container-low" />
            <div className="h-16 rounded-lg bg-surface-container-low" />
            <div className="h-16 rounded-lg bg-surface-container-low" />
          </div>
        </div>
      </div>
      {/* Extra dim overlay for depth */}
      <div
        className="fixed inset-0 z-10 bg-gradient-to-b from-background/40 via-background/60 to-background pointer-events-none"
        aria-hidden
      />

      {/* Header — Rafiq is listening… */}
      <header className="relative z-30 flex justify-between items-center px-container-padding py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Orb size={40} />
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md-mobile text-primary leading-tight">
              {listening ? "Rafiq is listening…" : processing ? "Thinking…" : "Rafiq voice"}
            </span>
            <span className="font-label-sm text-label-sm text-outline tracking-wider" dir="rtl">
              {listening ? "…رفيق يستمع" : "رفيق الصوتي"}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close voice and open chat"
          onClick={() => router.push("/rafiq/chat")}
          className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface hover:opacity-80 transition-opacity active:scale-90"
        >
          <Icon name="close" />
        </button>
      </header>

      {/* Main canvas */}
      <main className="relative z-20 flex-1 flex flex-col items-center gap-5 px-container-padding pt-2 overflow-y-auto hide-scrollbar">
        {/* Hint chips + language toggle */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {HINTS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => handleRef.current(h)}
              disabled={processing}
              className="min-h-11 px-4 py-2 rounded-full glass-panel font-label-sm text-[12px] text-on-surface-variant hover:text-primary active:scale-95 transition-all disabled:opacity-40"
            >
              “{h}”
            </button>
          ))}
          <div className="flex items-center gap-1 bg-surface-container-high rounded-full p-1" role="group" aria-label="Recognition language">
            <button
              type="button"
              onClick={() => setSpeechLang("en-US")}
              className={`min-h-9 px-3 py-1.5 rounded-full text-[12px] font-label-sm transition-colors ${
                speechLang === "en-US" ? "bg-primary-container text-white" : "text-on-surface-variant"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setSpeechLang("ar-JO")}
              className={`min-h-9 px-3 py-1.5 rounded-full text-[12px] font-label-sm transition-colors ${
                speechLang === "ar-JO" ? "bg-primary-container text-white" : "text-on-surface-variant"
              }`}
            >
              ع
            </button>
          </div>
        </div>

        {/* Live transcript */}
        <div className="text-center min-h-[80px] flex items-center justify-center w-full max-w-md">
          {displayText ? (
            <h1
              className="font-display-lg-mobile text-display-lg-mobile text-on-surface leading-tight transition-all duration-300"
              dir={/[؀-ۿ]/.test(displayText) ? "rtl" : "ltr"}
            >
              “{displayText}”
            </h1>
          ) : (
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {fallback ? "Type your command below" : "Say something like “Transfer 500 JOD to savings”"}
            </p>
          )}
        </div>

        {processing && (
          <div className="glass-panel px-4 py-3 rounded-full flex items-center gap-1.5 fade-up" aria-label="Rafiq is thinking">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="typing-dot w-2 h-2 rounded-full bg-on-surface-variant inline-block"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        )}

        {cmdError && (
          <div className="glass-panel rounded-2xl px-5 py-4 w-full max-w-md flex items-center justify-between gap-3 fade-up">
            <p className="text-error font-label-sm text-label-sm" role="alert">
              {cmdError}
            </p>
            <button
              type="button"
              onClick={resetForNext}
              className="min-h-11 px-3 font-label-sm text-label-sm text-primary active:scale-95 transition-transform"
            >
              Try again
            </button>
          </div>
        )}

        {/* Transfer confirmation card */}
        {transferConfirm && (
          <div className="glass-panel rounded-2xl p-5 w-full max-w-md space-y-4 fade-up">
            <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest flex items-center gap-2">
              <Icon name="verified_user" className="text-[16px]" />
              Confirm Transfer
            </p>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase text-outline font-label-sm">From</p>
                <p className="font-headline-md text-[16px] text-on-surface truncate">{transferConfirm.fromName}</p>
              </div>
              <Icon name="arrow_forward" className="text-primary shrink-0" />
              <div className="min-w-0 text-right">
                <p className="text-[11px] uppercase text-outline font-label-sm">To</p>
                <p className="font-headline-md text-[16px] text-on-surface truncate">{transferConfirm.toName}</p>
              </div>
            </div>
            <p className="text-center font-display-lg text-[32px] leading-10 text-on-surface">
              {fmtJod(transferConfirm.amountMils)}
            </p>
            {execError && (
              <p className="text-error font-label-sm text-label-sm text-center" role="alert">
                {execError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForNext}
                className="flex-1 min-h-11 py-3.5 rounded-full glass-panel text-on-surface-variant font-label-sm text-label-sm active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setFaceId(true)}
                className="flex-1 min-h-11 py-3.5 rounded-full bg-primary-container text-white font-label-sm text-label-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Icon name="familiar_face_and_zone" className="text-[18px]" />
                FaceID
              </button>
            </div>
          </div>
        )}

        {/* Speech-only response (balance / unknown) */}
        {result && !transferConfirm && (
          <div className="glass-panel rounded-2xl p-5 w-full max-w-md space-y-4 fade-up">
            <div className="flex items-start gap-3">
              <Orb size={28} pulse={false} className="mt-0.5" />
              <p className="font-body-lg text-body-lg text-on-surface flex-1">{result.speech}</p>
            </div>
            <button
              type="button"
              onClick={resetForNext}
              className="w-full min-h-11 py-3 rounded-full bg-surface-container-high border border-white/10 text-on-surface font-label-sm text-label-sm active:scale-95 transition-transform"
            >
              Ask again
            </button>
          </div>
        )}

        {/* Executed transfer success */}
        {done && (
          <div className="glass-panel rounded-2xl p-6 w-full max-w-md flex flex-col items-center gap-4 text-center fade-up">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-tertiary/20 animate-ping" aria-hidden />
              <div className="w-16 h-16 rounded-full bg-tertiary flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(255,185,85,0.4)]">
                <Icon name="check" className="text-on-tertiary text-3xl" style={{ fontVariationSettings: "'wght' 700" }} />
              </div>
            </div>
            <p className="font-body-lg text-body-lg text-on-surface">{done}</p>
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={resetForNext}
                className="flex-1 min-h-11 py-3 rounded-full bg-surface-container-high border border-white/10 text-on-surface font-label-sm text-label-sm active:scale-95 transition-transform"
              >
                New command
              </button>
              <Link
                href="/rafiq"
                className="flex-1 min-h-11 py-3 rounded-full bg-primary-container text-white font-label-sm text-label-sm flex items-center justify-center active:scale-95 transition-transform"
              >
                Done
              </Link>
            </div>
          </div>
        )}

        {/* Waveform + glowing orb */}
        <div className="mt-auto flex flex-col items-center gap-6 pb-6 pt-4">
          <div className="flex items-end justify-center gap-1 h-10" aria-hidden>
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className={`w-1 rounded-full ${waveActive ? "wave-bar" : "opacity-30"} ${
                  i % 2 ? "bg-primary-container" : "bg-primary"
                }`}
                style={{
                  height: `${8 + ((i * 5) % 23)}px`,
                  animationDelay: `${(i % 8) * 0.11}s`,
                  animationDuration: `${1 + (i % 5) * 0.12}s`,
                }}
              />
            ))}
          </div>
          <div className="relative">
            <div className="kinetic-glow absolute -inset-16 rounded-full pointer-events-none glow-breathe" aria-hidden />
            <div className="absolute -inset-5 rounded-full glass-panel border-primary-container/20 opacity-60" aria-hidden />
            <Orb
              size={96}
              onClick={fallback ? undefined : listening ? stopListening : startListening}
              label={listening ? "Stop listening" : "Start listening"}
            />
          </div>
          <p className="font-label-sm text-[12px] text-outline">
            {fallback
              ? supported
                ? "Microphone unavailable — type your command below"
                : "Voice recognition unavailable — type your command below"
              : listening
                ? "Tap the orb to pause"
                : "Tap the orb to talk"}
          </p>
        </div>
      </main>

      {/* Bottom command bar (always available; primary path in fallback mode) */}
      <div className="relative z-30 px-container-padding pb-4 pb-safe shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = typed.trim();
            if (!t || processing) return;
            setTyped("");
            handleRef.current(t);
          }}
          className="glass-panel rafiq-input-glow rounded-full p-1.5 flex items-center gap-2"
        >
          <span className="w-11 h-11 flex items-center justify-center text-primary-container shrink-0" aria-hidden>
            <Icon name="mic" filled={listening} />
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your command…"
            aria-label="Type your command"
            dir={/[؀-ۿ]/.test(typed) ? "rtl" : "ltr"}
            className="flex-1 min-w-0 bg-transparent outline-none border-none text-on-surface placeholder:text-outline font-body-md text-body-md py-2"
          />
          <button
            type="submit"
            disabled={processing || !typed.trim()}
            aria-label="Send command"
            className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 shrink-0"
          >
            <Icon name="send" />
          </button>
        </form>
      </div>

      <FaceIdScan
        open={faceId}
        busy={executing}
        label="FaceID to Confirm"
        sublabel={
          transferConfirm
            ? `${fmtJod(transferConfirm.amountMils)} · ${transferConfirm.fromName} → ${transferConfirm.toName}`
            : "Hold still — confirming it's you."
        }
        onCancel={() => {
          if (!executing) setFaceId(false);
        }}
        onScanned={() => void executeTransfer()}
      />
    </div>
  );
}
