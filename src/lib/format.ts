// Client-safe formatting helpers (no server imports).

export function fmtJod(mils: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign && mils > 0 ? "+" : mils < 0 ? "-" : "";
  const abs = Math.abs(mils) / 1000;
  return `${sign}JOD ${abs.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

export function fmtJod2(mils: number): string {
  const abs = Math.abs(mils) / 1000;
  return `JOD ${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtJodPlain(mils: number): string {
  return (mils / 1000).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

export function toMils(jod: number): number {
  return Math.round(jod * 1000);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
