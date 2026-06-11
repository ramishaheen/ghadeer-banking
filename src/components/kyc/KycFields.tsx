"use client";

import { Icon } from "@/components/Icon";

/** Shared input chrome per the kinetic design system (design 20/03). */
function inputFrame(error?: string) {
  return `w-full bg-surface-container-lowest border rounded-lg px-4 py-3 font-body-lg text-body-lg text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow ${
    error ? "border-error" : "border-outline-variant"
  }`;
}

export function Field({
  id,
  label,
  error,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-label-sm text-label-sm text-on-surface-variant ml-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-error text-label-sm ml-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  dataTut,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  dataTut?: string;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <input
        id={id}
        type="text"
        data-tut={dataTut}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputFrame(error)}
      />
    </Field>
  );
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputFrame(error)} appearance-none pr-12 ${value ? "" : "text-on-surface-variant/60"}`}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <Icon
          name="expand_more"
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant"
        />
      </div>
    </Field>
  );
}

export function StepperField({
  id,
  label,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="font-label-sm text-label-sm text-on-surface-variant ml-1">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1.5"
      >
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-11 h-11 rounded-full flex items-center justify-center text-primary hover:bg-surface-container disabled:opacity-30 active:scale-95 transition-transform"
        >
          <Icon name="remove" />
        </button>
        <span className="font-headline-md text-headline-md text-on-surface tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-11 h-11 rounded-full flex items-center justify-center text-primary hover:bg-surface-container disabled:opacity-30 active:scale-95 transition-transform"
        >
          <Icon name="add" />
        </button>
      </div>
    </div>
  );
}

/** 2-col radio cards per design 20 (marital status picker). */
export function RadioCardGroup({
  name,
  label,
  options,
  value,
  onChange,
  error,
  dataTut,
}: {
  name: string;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  dataTut?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label={label}
        data-tut={dataTut}
        className="grid grid-cols-2 gap-3 rounded-2xl"
      >
        {options.map((o) => {
          const selected = value === o;
          return (
            <label
              key={o}
              className={`flex items-center justify-between gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[56px] ${
                selected
                  ? "border-primary-container bg-secondary-container/20 shadow-md"
                  : "border-surface-variant bg-surface hover:border-primary-container/50"
              }`}
            >
              <span
                className={`font-body-lg text-body-lg ${selected ? "font-bold text-primary" : "text-on-surface"}`}
              >
                {o}
              </span>
              <input
                type="radio"
                name={name}
                value={o}
                checked={selected}
                onChange={() => onChange(o)}
                className="w-5 h-5 shrink-0 accent-primary"
              />
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-error text-label-sm ml-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
