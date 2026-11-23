import { normalizeSeverity } from "../lib/alertDisplay";
import type { SeverityLevel } from "../lib/alertDisplay";

const STYLES: Record<SeverityLevel, string> = {
  CRITICAL: "border-sev-critical/40 bg-sev-critical/15 text-sev-critical",
  HIGH: "border-sev-high/40 bg-sev-high/15 text-sev-high",
  MEDIUM: "border-sev-medium/40 bg-sev-medium/15 text-sev-medium",
  LOW: "border-sev-low/40 bg-sev-low/15 text-sev-low",
};

export default function SeverityBadge({ raw }: { raw: string }) {
  const level = normalizeSeverity(raw);
  if (!level) {
    return <span className="font-mono text-xs text-muted">{raw}</span>;
  }
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${STYLES[level]}`}
    >
      {level}
    </span>
  );
}
