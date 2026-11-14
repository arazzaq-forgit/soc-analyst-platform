import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "./StateViews";
import { STATUS_LABELS, STATUS_OPTIONS } from "../lib/alertDisplay";
import type { Alert, TriageStatus } from "../types";

const STATUS_COLORS: Record<TriageStatus, string> = {
  pending: "#f59e0b",
  cleared_threshold: "#a855f7",
  investigating: "#38bdf8",
  resolved: "#34d399",
  dismissed: "#64748b",
};

const TICK = { fill: "#7d8aa5", fontSize: 11 };
const TOOLTIP_STYLE = {
  background: "#0d1526",
  border: "1px solid #1f2d4a",
  borderRadius: 6,
  color: "#e6edf7",
  fontSize: 12,
};

function ChartCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">{title}</p>
      <div className="mt-4 h-56">{children}</div>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

export default function AlertCharts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;

  const statusData = STATUS_OPTIONS.map((s) => ({
    key: s,
    label: STATUS_LABELS[s],
    count: alerts.filter((a) => a.triage_status === s).length,
  }));

  const bins = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10}-${i * 10 + 10}%`, count: 0 }));
  let scored = 0;
  for (const a of alerts) {
    if (a.false_positive_score === null) continue;
    const clamped = Math.min(1, Math.max(0, a.false_positive_score));
    bins[Math.min(9, Math.floor(clamped * 10))].count += 1;
    scored += 1;
  }
  const unscored = alerts.length - scored;

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <ChartCard title="Alerts by status">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusData}>
            <CartesianGrid stroke="#1f2d4a" vertical={false} />
            <XAxis dataKey="label" tick={TICK} interval={0} />
            <YAxis tick={TICK} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <Bar dataKey="count" name="Alerts" radius={[4, 4, 0, 0]}>
              {statusData.map((d) => (
                <Cell key={d.key} fill={STATUS_COLORS[d.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="False-positive score distribution"
        note={`${scored} scored, ${unscored} not scored yet (not shown).`}
      >
        {scored === 0 ? (
          <EmptyState
            title="No scored alerts yet."
            hint="Scores appear once the ML classifier is connected."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bins}>
              <CartesianGrid stroke="#1f2d4a" vertical={false} />
              <XAxis dataKey="label" tick={TICK} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={TICK} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
              <Bar dataKey="count" name="Alerts" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
