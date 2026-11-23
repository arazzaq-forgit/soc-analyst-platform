import type { Alert, AlertSource, TriageStatus } from "../types";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// severity_raw is a free string, so unknown values return null.
export function normalizeSeverity(raw: string): SeverityLevel | null {
  const s = raw.trim().toLowerCase();
  if (s === "critical") return "CRITICAL";
  if (s === "high") return "HIGH";
  if (s === "medium" || s === "med") return "MEDIUM";
  if (s === "low") return "LOW";
  return null;
}

export const SEVERITY_OPTIONS: SeverityLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const STATUS_LABELS: Record<TriageStatus, string> = {
  pending: "Pending",
  cleared_threshold: "Cleared Threshold",
  investigating: "Investigating",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const STATUS_OPTIONS: TriageStatus[] = [
  "pending",
  "cleared_threshold",
  "investigating",
  "resolved",
  "dismissed",
];

export const SOURCE_OPTIONS: AlertSource[] = ["SIEM", "EDR", "cloud_audit"];

// The database may return times without a timezone marker.
// We treat those as UTC, then show them in the viewer's local timezone.
export function parseTimestamp(ts: string): Date {
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(ts);
  return new Date(hasZone ? ts : `${ts}Z`);
}

export function formatTimestamp(ts: string): string {
  const d = parseTimestamp(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
}

// Assumes false_positive_score is between 0 and 1.
export function scoreToPercent(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

export function isNoise(alert: Alert): boolean {
  const scored = alert.false_positive_score !== null && alert.false_positive_score >= 0.8;
  return scored || alert.triage_status === "dismissed";
}
