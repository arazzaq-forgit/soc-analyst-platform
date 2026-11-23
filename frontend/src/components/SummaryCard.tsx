export type CardTone = "info" | "danger" | "good" | "warn";

const TONES: Record<CardTone, string> = {
  info: "text-accent",
  danger: "text-sev-critical",
  good: "text-st-resolved",
  warn: "text-st-pending",
};

interface SummaryCardProps {
  label: string;
  value: number | string;
  hint: string;
  tone: CardTone;
}

export default function SummaryCard({ label, value, hint, tone }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${TONES[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
