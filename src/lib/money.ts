// JOD has 3 decimal places (fils). All amounts are stored as integer mils.
// 1 JOD = 1000 mils.

export function toMils(jod: number): number {
  return Math.round(jod * 1000);
}

export function toJod(mils: number): number {
  return mils / 1000;
}

export function formatJod(mils: number, opts?: { sign?: boolean; compact?: boolean }): string {
  const sign = opts?.sign && mils > 0 ? "+" : mils < 0 ? "-" : "";
  const abs = Math.abs(mils) / 1000;
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return `${sign}JOD ${formatted}`;
}

export function formatJodShort(mils: number): string {
  const abs = Math.abs(mils) / 1000;
  return `JOD ${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseJodInput(input: string): number | null {
  const cleaned = input.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return toMils(value);
}
