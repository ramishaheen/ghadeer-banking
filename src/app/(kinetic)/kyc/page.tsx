"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, useApi, type Me } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { ErrorState, Skeleton } from "@/components/States";
import { Orb } from "@/components/rafiq/Orb";
import { TutorialScrim } from "@/components/tutorial/TutorialScrim";
import {
  Field,
  RadioCardGroup,
  SelectField,
  StepperField,
  TextField,
} from "@/components/kyc/KycFields";

// ── Server payloads ─────────────────────────────────────────────────────────
type KycProfile = {
  id: string;
  userId: string;
  step: number;
  status: string;
  maritalStatus: string | null;
  spouseName: string | null;
  dependents: number | null;
  nationality: string | null;
  employmentStatus: string | null;
  companyName: string | null;
  jobTitle: string | null;
  monthlyIncome: string | null;
  submittedAt: string | null;
  updatedAt: string;
};
type KycResponse = { kyc: KycProfile | null; kycStatus: string };

const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"] as const;
const EMPLOYMENT_OPTIONS = ["Employed", "Self-employed", "Retired", "Student", "Unemployed"] as const;
const INCOME_RANGES = ["< JOD 500", "JOD 500–1,000", "JOD 1,000–2,500", "JOD 2,500+"] as const;
const NATIONALITIES = [
  "Jordanian",
  "Saudi",
  "Emirati",
  "Egyptian",
  "Iraqi",
  "Lebanese",
  "Palestinian",
  "Syrian",
  "Other",
] as const;

type FieldErrors = Partial<
  Record<
    "maritalStatus" | "spouseName" | "nationality" | "employmentStatus" | "companyName",
    string
  >
>;

// ── Small presentational bits ───────────────────────────────────────────────
function PageHeader({ step, showProgress }: { step: number; showProgress: boolean }) {
  return (
    <header className="fixed top-0 inset-x-0 mx-auto max-w-[420px] z-50 bg-surface/95 backdrop-blur px-container-margin pt-3 pb-2">
      <div className="flex items-center gap-1">
        <Link
          href="/"
          aria-label="Back to home"
          className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-transform"
        >
          <Icon name="arrow_back" className="text-on-surface" />
        </Link>
        <h1 className="flex-1 font-headline-md text-headline-md text-on-surface">KYC Update</h1>
        {showProgress && (
          <span className="font-label-sm text-label-sm text-on-surface-variant">{step} of 5</span>
        )}
      </div>
      {showProgress && (
        <div className="mt-2 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-500"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
}

function ChecklistRow({
  icon,
  title,
  subtitle,
  state,
  dataTut,
}: {
  icon: string;
  title: string;
  subtitle: string;
  state: "done" | "active" | "pending";
  dataTut?: string;
}) {
  return (
    <div
      data-tut={dataTut}
      className={`bg-surface-container-lowest p-element-padding rounded-xl flex items-center gap-4 border ${
        state === "active"
          ? "border-primary-container/60 shadow-md"
          : "border-outline-variant/30"
      } ${state === "done" ? "opacity-60" : ""}`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          state === "done"
            ? "bg-green-100"
            : state === "active"
              ? "bg-primary-fixed"
              : "bg-surface-container"
        }`}
      >
        <Icon
          name={state === "done" ? "check_circle" : icon}
          filled={state === "done"}
          className={
            state === "done"
              ? "text-green-600"
              : state === "active"
                ? "text-primary"
                : "text-on-surface-variant"
          }
        />
      </div>
      <div className="flex-grow min-w-0">
        <h3
          className={`font-body-lg text-body-lg text-on-surface ${state === "active" ? "font-bold" : ""}`}
        >
          {title}
        </h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant">{subtitle}</p>
      </div>
      {state === "active" && <Icon name="arrow_forward_ios" className="text-primary-container" />}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-surface-variant/40 last:border-0">
      <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider shrink-0">
        {label}
      </p>
      <p className="font-body-lg text-body-lg text-on-surface text-right truncate">{value}</p>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function KycPage() {
  const { data, error, loading, reload } = useApi<KycResponse>("/api/kyc");
  const { data: me } = useApi<Me>("/api/me");

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [scrimOpen, setScrimOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  // Form state (personal + work).
  const [maritalStatus, setMaritalStatus] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [dependents, setDependents] = useState(0);
  const [nationality, setNationality] = useState("Jordanian");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");

  // Hydrate once from the saved profile and resume at the right step.
  useEffect(() => {
    if (!data || hydratedRef.current) return;
    hydratedRef.current = true;
    const k = data.kyc;
    if (k) {
      setMaritalStatus(k.maritalStatus ?? "");
      setSpouseName(k.spouseName ?? "");
      setDependents(k.dependents ?? 0);
      setNationality(k.nationality ?? "Jordanian");
      setEmploymentStatus(k.employmentStatus ?? "");
      setCompanyName(k.companyName ?? "");
      setJobTitle(k.jobTitle ?? "");
      setMonthlyIncome(k.monthlyIncome ?? "");
    }
    if (data.kycStatus === "SUBMITTED" || k?.status === "SUBMITTED") {
      setSubmitted(true);
      return;
    }
    // kyc.step is the last completed step: resume at the next one.
    const resume = Math.min(Math.max((k?.step ?? 0) + 1, 1), 5);
    setStep(resume);
    setScrimOpen(resume >= 2);
  }, [data]);

  // ── Persistence helpers ──
  const persistTutorial = useCallback((body: Record<string, unknown>) => {
    void api("/api/tutorials", {
      method: "POST",
      body: JSON.stringify({ key: "KYC_UPDATE", ...body }),
    }).catch(() => {});
  }, []);

  const persistKycStep = useCallback((n: number) => {
    void api("/api/kyc", { method: "POST", body: JSON.stringify({ step: n }) }).catch(() => {});
  }, []);

  /** Forward progression: shows the orb guide for the new step. */
  const goTo = useCallback((n: number) => {
    setStep(n);
    setScrimOpen(n >= 2);
    setFormError(null);
    window.scrollTo({ top: 0 });
  }, []);

  /** Backward jump (edit / server validation): no guide, show the form directly. */
  const jumpTo = useCallback((n: number) => {
    setStep(n);
    setScrimOpen(false);
    window.scrollTo({ top: 0 });
  }, []);

  /** Map a server error message onto fields and jump to the offending step. */
  const applyServerError = useCallback(
    (msg: string) => {
      const lower = msg.toLowerCase();
      const errs: FieldErrors = {};
      if (lower.includes("spouse"))
        errs.spouseName = "Spouse name is required when marital status is Married.";
      if (lower.includes("company"))
        errs.companyName = "Company name is required when employment status is Employed.";
      if (lower.startsWith("cannot submit")) {
        if (lower.includes("marital status")) errs.maritalStatus = "Marital status is required.";
        if (lower.includes("nationality")) errs.nationality = "Nationality is required.";
        if (lower.includes("employment status"))
          errs.employmentStatus = "Employment status is required.";
      }
      if (Object.keys(errs).length === 0) {
        setFormError(msg);
        return;
      }
      setFieldErrors((prev) => ({ ...prev, ...errs }));
      if (errs.maritalStatus || errs.nationality || errs.spouseName) jumpTo(3);
      else jumpTo(4);
    },
    [jumpTo]
  );

  // ── Step actions ──
  const letsGo = useCallback(() => {
    goTo(2);
    persistTutorial({ step: 1 });
    persistKycStep(1);
  }, [goTo, persistTutorial, persistKycStep]);

  const leaveOverview = useCallback(() => {
    goTo(3);
    persistTutorial({ step: 2 });
    persistKycStep(2);
  }, [goTo, persistTutorial, persistKycStep]);

  const submitPersonal = useCallback(async () => {
    const errs: FieldErrors = {};
    if (!maritalStatus) errs.maritalStatus = "Please select your marital status.";
    if (maritalStatus === "Married" && !spouseName.trim())
      errs.spouseName = "Spouse name is required when marital status is Married.";
    if (!nationality) errs.nationality = "Please select your nationality.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setPending(true);
    setFormError(null);
    try {
      await api("/api/kyc", {
        method: "POST",
        body: JSON.stringify({
          step: 3,
          personal: {
            maritalStatus,
            spouseName: maritalStatus === "Married" ? spouseName.trim() : "",
            dependents,
            nationality,
          },
        }),
      });
      persistTutorial({ step: 3 });
      goTo(4);
    } catch (e) {
      applyServerError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setPending(false);
    }
  }, [maritalStatus, spouseName, dependents, nationality, goTo, persistTutorial, applyServerError]);

  const submitWork = useCallback(async () => {
    const errs: FieldErrors = {};
    if (!employmentStatus) errs.employmentStatus = "Please select your employment status.";
    if (employmentStatus === "Employed" && !companyName.trim())
      errs.companyName = "Company name is required when employment status is Employed.";
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setPending(true);
    setFormError(null);
    try {
      await api("/api/kyc", {
        method: "POST",
        body: JSON.stringify({
          step: 4,
          work: {
            employmentStatus,
            companyName: companyName.trim(),
            jobTitle: jobTitle.trim(),
            monthlyIncome,
          },
        }),
      });
      persistTutorial({ step: 4 });
      goTo(5);
    } catch (e) {
      applyServerError(e instanceof Error ? e.message : "Could not save. Please try again.");
    } finally {
      setPending(false);
    }
  }, [employmentStatus, companyName, jobTitle, monthlyIncome, goTo, persistTutorial, applyServerError]);

  const submitAll = useCallback(async () => {
    if (pending) return;
    setPending(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await api("/api/kyc/submit", { method: "POST" });
      setSubmitted(true);
      persistTutorial({ completed: true });
      window.scrollTo({ top: 0 });
    } catch (e) {
      applyServerError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setPending(false);
    }
  }, [pending, persistTutorial, applyServerError]);

  // ── Loading / error / submitted states ──
  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="px-container-margin pt-4 space-y-5" data-testid="kyc-skeleton">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-full" />
            <Skeleton className="h-6 w-36" />
            <div className="ml-auto">
            <Skeleton className="h-4 w-12" />
          </div>
          </div>
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh bg-background">
        <PageHeader step={1} showProgress={false} />
        <main className="pt-20">
          <ErrorState message={error} onRetry={() => void reload()} />
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-dvh bg-background">
        <PageHeader step={5} showProgress={false} />
        <main className="pt-24 pb-16 px-container-margin flex flex-col items-center text-center fade-up">
          <div className="mt-12 w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
            <Icon name="check_circle" filled className="text-green-600" style={{ fontSize: 56 }} />
          </div>
          <h2 className="mt-6 font-display-lg-mobile text-display-lg-mobile text-on-surface">
            KYC update complete
          </h2>
          <p className="mt-2 font-body-md text-body-md text-on-surface-variant max-w-[32ch]">
            Your information is verified and your account stays fully active.
          </p>
          <Link
            href="/"
            className="mt-8 w-full bg-primary text-on-primary font-bold py-3.5 rounded-full active:scale-95 transition-transform shadow-lg shadow-primary/20"
          >
            Back to Home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader step={step} showProgress />

      <main className="pt-24 pb-32 px-container-margin">
        {/* STEP 1 — trigger / intro (design 27) */}
        {step === 1 && (
          <section className="fade-up">
            <div className="mt-6 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-sm p-element-padding flex flex-col items-center text-center gap-4">
              <Orb size={72} />
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Annual verification
              </span>
              <h2 className="font-headline-md text-headline-md-mobile text-on-surface">
                Keep your account secure
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                It&rsquo;s time for your annual KYC update to keep your account secure.
              </p>
              <ul className="w-full space-y-card-gap text-left">
                {[
                  { icon: "person", title: "Personal details", sub: "Marital status, dependents & nationality" },
                  { icon: "work", title: "Work details", sub: "Employer, job title & income" },
                  { icon: "task_alt", title: "Review", sub: "Check everything and submit" },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="flex items-center gap-3 bg-surface-container-low rounded-lg p-3"
                  >
                    <span className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                      <Icon name={item.icon} className="text-primary" style={{ fontSize: 20 }} />
                    </span>
                    <div className="min-w-0">
                      <p className="font-body-lg text-body-lg text-on-surface">{item.title}</p>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">{item.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={letsGo}
                className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-full active:scale-95 transition-transform shadow-lg shadow-primary/20"
              >
                Let&rsquo;s go
              </button>
              <Link href="/" className="py-2 text-primary font-bold text-body-md font-body-md">
                Maybe later
              </Link>
            </div>
          </section>
        )}

        {/* STEP 2 — section overview checklist (design 04) */}
        {step === 2 && (
          <section className="space-y-6">
            <div>
              <h2 className="font-headline-md text-headline-md-mobile text-on-surface">
                Update checklist
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Three quick sections keep your profile current.
              </p>
            </div>
            <div className="space-y-card-gap">
              <ChecklistRow
                icon="badge"
                title="Identity verification"
                subtitle="Verified via document scan"
                state="done"
              />
              <ChecklistRow
                icon="person"
                title="Personal details"
                subtitle="In progress"
                state="active"
                dataTut="kyc-personal-row"
              />
              <ChecklistRow icon="work" title="Work details" subtitle="Pending" state="pending" />
              <ChecklistRow
                icon="task_alt"
                title="Review & submit"
                subtitle="Pending"
                state="pending"
              />
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={leaveOverview}
                className="bg-primary-container text-white font-bold px-12 py-4 rounded-full shadow-md active:scale-95 transition-transform"
              >
                Next
              </button>
            </div>
          </section>
        )}

        {/* STEP 3 — personal info entry (design 20) */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline-md text-headline-md-mobile text-on-surface">
                Personal details
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Confirm your current personal information.
              </p>
            </div>

            {me && (
              <section className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-outline-variant/40">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
                  Identification
                </h3>
                <Field id="kyc-name" label="Full legal name">
                  <input
                    id="kyc-name"
                    type="text"
                    disabled
                    value={me.user.name}
                    className="w-full bg-surface-container-low border-none rounded-lg p-3 text-on-surface-variant font-body-lg text-body-lg cursor-not-allowed"
                  />
                </Field>
              </section>
            )}

            <section className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-outline-variant/40">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
                Marital status
              </h3>
              <RadioCardGroup
                name="marital_status"
                label="Marital status"
                options={MARITAL_OPTIONS}
                value={maritalStatus}
                onChange={(v) => {
                  setMaritalStatus(v);
                  setFieldErrors((prev) => ({ ...prev, maritalStatus: undefined }));
                }}
                error={fieldErrors.maritalStatus}
                dataTut="kyc-marital"
              />
            </section>

            {maritalStatus === "Married" && (
              <section className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-outline-variant/40">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-4">
                  Spouse information
                </h3>
                <TextField
                  id="kyc-spouse"
                  label="Spouse's full name"
                  value={spouseName}
                  onChange={(v) => {
                    setSpouseName(v);
                    setFieldErrors((prev) => ({ ...prev, spouseName: undefined }));
                  }}
                  placeholder="e.g. Lina Haddad"
                  error={fieldErrors.spouseName}
                />
              </section>
            )}

            <section className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-outline-variant/40 space-y-4">
              <h3 className="font-headline-md text-headline-md text-on-surface">Household</h3>
              <StepperField
                id="kyc-dependents"
                label="Dependents"
                value={dependents}
                onChange={setDependents}
              />
              <SelectField
                id="kyc-nationality"
                label="Nationality"
                value={nationality}
                onChange={(v) => {
                  setNationality(v);
                  setFieldErrors((prev) => ({ ...prev, nationality: undefined }));
                }}
                options={NATIONALITIES}
                error={fieldErrors.nationality}
              />
            </section>

            {formError && (
              <p className="text-error text-label-sm" role="alert">
                {formError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void submitPersonal()}
                disabled={pending}
                className="bg-primary-container text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-primary-container/20 active:scale-95 transition-transform disabled:opacity-60"
              >
                {pending ? "Saving…" : "Next"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — work details (design 03) */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-headline-md text-headline-md-mobile text-on-surface">
                Work details
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Please provide your current professional information.
              </p>
            </div>

            <SelectField
              id="kyc-employment"
              label="Employment status"
              value={employmentStatus}
              onChange={(v) => {
                setEmploymentStatus(v);
                setFieldErrors((prev) => ({ ...prev, employmentStatus: undefined }));
              }}
              options={EMPLOYMENT_OPTIONS}
              placeholder="Select status"
              error={fieldErrors.employmentStatus}
            />

            <TextField
              id="kyc-company"
              label={employmentStatus === "Employed" ? "Company name" : "Company name (optional)"}
              value={companyName}
              onChange={(v) => {
                setCompanyName(v);
                setFieldErrors((prev) => ({ ...prev, companyName: undefined }));
              }}
              placeholder="e.g. Etihad Engineering Ltd"
              error={fieldErrors.companyName}
              dataTut="kyc-company"
            />

            <TextField
              id="kyc-job-title"
              label="Job title"
              value={jobTitle}
              onChange={setJobTitle}
              placeholder="e.g. Senior Project Manager"
            />

            <SelectField
              id="kyc-income"
              label="Monthly income"
              value={monthlyIncome}
              onChange={setMonthlyIncome}
              options={INCOME_RANGES}
              placeholder="Select range"
            />

            {formError && (
              <p className="text-error text-label-sm" role="alert">
                {formError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void submitWork()}
                disabled={pending}
                className="bg-primary-container text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-primary-container/20 active:scale-95 transition-transform disabled:opacity-60"
              >
                {pending ? "Saving…" : "Next"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — review & submit (design 06) */}
        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-headline-md text-headline-md-mobile text-on-surface">
                Review update
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Make sure everything looks right before submitting.
              </p>
            </div>

            <section className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-outline-variant/40">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-headline-md text-headline-md text-on-surface">Personal</h3>
                <button
                  type="button"
                  aria-label="Edit personal details"
                  onClick={() => jumpTo(3)}
                  className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-transform"
                >
                  <Icon name="edit" className="text-primary" style={{ fontSize: 20 }} />
                </button>
              </div>
              <SummaryRow label="Marital status" value={maritalStatus || "—"} />
              {maritalStatus === "Married" && (
                <SummaryRow label="Spouse name" value={spouseName || "—"} />
              )}
              <SummaryRow label="Dependents" value={String(dependents)} />
              <SummaryRow label="Nationality" value={nationality || "—"} />
            </section>

            <section className="bg-surface-container-lowest p-element-padding rounded-xl shadow-sm border border-outline-variant/40">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-headline-md text-headline-md text-on-surface">Work</h3>
                <button
                  type="button"
                  aria-label="Edit work details"
                  onClick={() => jumpTo(4)}
                  className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full hover:bg-surface-container active:scale-95 transition-transform"
                >
                  <Icon name="edit" className="text-primary" style={{ fontSize: 20 }} />
                </button>
              </div>
              <SummaryRow label="Employment status" value={employmentStatus || "—"} />
              <SummaryRow label="Company name" value={companyName || "—"} />
              <SummaryRow label="Job title" value={jobTitle || "—"} />
              <SummaryRow label="Monthly income" value={monthlyIncome || "—"} />
            </section>

            <div className="bg-primary/5 p-element-padding rounded-xl border border-primary/10 flex items-start gap-3">
              <div className="p-2 bg-primary-fixed rounded-lg shrink-0">
                <Icon name="info" className="text-primary" style={{ fontSize: 20 }} />
              </div>
              <div>
                <p className="font-body-lg text-body-lg text-on-primary-container font-semibold">
                  Ready for submission
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  Your update takes effect immediately after the final authorization.
                </p>
              </div>
            </div>

            {formError && (
              <p className="text-error text-label-sm" role="alert">
                {formError}
              </p>
            )}

            <button
              type="button"
              data-tut="kyc-submit"
              onClick={() => void submitAll()}
              disabled={pending}
              className="w-full h-14 bg-primary text-on-primary rounded-full font-bold text-body-lg font-body-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {pending ? (
                "Submitting…"
              ) : (
                <>
                  Submit
                  <Icon name="arrow_forward" style={{ fontSize: 20 }} />
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* ── Orb guide scrims (one per step, dismissible) ── */}
      {scrimOpen && step === 2 && (
        <TutorialScrim
          targetSelector='[data-tut="kyc-personal-row"]'
          speech="We'll start with your personal details. This only takes a minute."
          step={2}
          totalSteps={5}
          buttons={[{ label: "Next", onClick: leaveOverview }]}
        />
      )}
      {scrimOpen && step === 3 && (
        <TutorialScrim
          targetSelector='[data-tut="kyc-marital"]'
          speech="Select your current status. If married, I'll help you with the spouse details next."
          step={3}
          totalSteps={5}
          buttons={[{ label: "Got it", onClick: () => setScrimOpen(false) }]}
        />
      )}
      {scrimOpen && step === 4 && (
        <TutorialScrim
          targetSelector='[data-tut="kyc-company"]'
          speech="Almost there! Just confirm your current employer and job title."
          step={4}
          totalSteps={5}
          buttons={[{ label: "Got it", onClick: () => setScrimOpen(false) }]}
        />
      )}
      {scrimOpen && step === 5 && (
        <TutorialScrim
          targetSelector='[data-tut="kyc-submit"]'
          speech="All looks good! Tap submit to complete your update. I'll handle the rest."
          step={5}
          totalSteps={5}
          bubblePosition="top"
          buttons={[
            {
              label: "Submit",
              onClick: () => {
                setScrimOpen(false);
                void submitAll();
              },
            },
          ]}
        />
      )}
    </div>
  );
}
