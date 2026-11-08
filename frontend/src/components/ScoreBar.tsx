import { scoreToPercent } from "../lib/alertDisplay";

export default function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="font-mono text-xs text-muted">Not scored</span>;
  }

  const pct = scoreToPercent(score);
  const color = pct >= 80 ? "bg-st-resolved" : pct >= 40 ? "bg-st-pending" : "bg-sev-low";

  return (
    <div className="w-32" title={`False-positive likelihood: ${pct}%`}>
      <div className="flex justify-between font-mono text-[10px] text-muted">
        <span>FP</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-line">
        <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
