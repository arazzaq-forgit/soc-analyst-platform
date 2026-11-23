import { STATUS_LABELS } from "../lib/alertDisplay";
import type { TriageStatus } from "../types";

const STYLES: Record<TriageStatus, string> = {
  pending: "border-st-pending/40 bg-st-pending/15 text-st-pending",
  cleared_threshold: "border-st-cleared/40 bg-st-cleared/15 text-st-cleared",
  investigating: "border-st-investigating/40 bg-st-investigating/15 text-st-investigating",
  resolved: "border-st-resolved/40 bg-st-resolved/15 text-st-resolved",
  dismissed: "border-st-dismissed/40 bg-st-dismissed/15 text-st-dismissed",
};

export default function StatusBadge({ status }: { status: TriageStatus }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${STYLES[status]}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
