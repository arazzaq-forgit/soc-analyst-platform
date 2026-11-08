import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAlert, fetchAlerts } from "../api/alerts";
import { ApiError } from "../api/client";
import BriefView from "../components/BriefView";
import ScoreBar from "../components/ScoreBar";
import SeverityBadge from "../components/SeverityBadge";
import StatusBadge from "../components/StatusBadge";
import { formatTimestamp, parseTimestamp } from "../lib/alertDisplay";
import { useInvestigationStream } from "../lib/useInvestigationStream";
import EvidencePanel from "../components/EvidencePanel";
import { parseBrief } from "../lib/citations";
import type { StreamStatus } from "../lib/useInvestigationStream";

const STATUS_NOTE: Record<StreamStatus, { text: string; cls: string }> = {
  idle: { text: "Ready. Click Start investigation.", cls: "text-muted" },
  streaming: { text: "Streaming...", cls: "text-accent" },
  done: { text: "Complete.", cls: "text-st-resolved" },
  stopped: { text: "Stopped by you. Partial brief shown.", cls: "text-st-pending" },
  interrupted: { text: "The stream ended early. Partial brief shown.", cls: "text-st-pending" },
  error: { text: "Connection problem.", cls: "text-sev-critical" },
};

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">{children}</dd>
    </div>
  );
}

function AlertPicker() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetchAlerts(200),
  });

  const sorted = [...(data ?? [])].sort(
    (a, b) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime(),
  );

  return (
    <section>
      <p className="font-mono text-xs tracking-widest text-accent">AEGIS // AI INVESTIGATION</p>
      <h1 className="mt-1 text-2xl font-semibold text-fg">AI Investigation Studio</h1>
      <p className="mt-1 text-sm text-muted">Pick an alert to investigate.</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-panel">
        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-panel-2" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-sev-critical">Could not load alerts.</p>
            <button
              onClick={() => void refetch()}
              className="mt-4 rounded-md border border-line px-4 py-2 text-sm text-fg hover:border-accent"
            >
              Retry
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            No alerts yet. Add one on the Ingest Alert page.
          </p>
        ) : (
          <ul className="max-h-[32rem] divide-y divide-line/60 overflow-y-auto">
            {sorted.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/investigate/${encodeURIComponent(a.alert_id)}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-panel-2"
                >
                  <span className="w-44 shrink-0 font-mono text-xs text-accent">{a.alert_id}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{a.description}</span>
                  <StatusBadge status={a.triage_status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function InvestigationView({ alertId }: { alertId: string }) {
  const alertQuery = useQuery({
    queryKey: ["alert", alertId],
    queryFn: () => fetchAlert(alertId),
  });
  const { text, status, error, start, stop } = useInvestigationStream(alertId);
  const parsed = useMemo(() => parseBrief(text, status === "done"), [text, status]);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedCitation = parsed.citations.find((c) => c.n === selected) ?? null;

  const alert = alertQuery.data;
  const streaming = status === "streaming";
  const note = STATUS_NOTE[status];
  const startLabel =
    status === "idle"
      ? "Start investigation"
      : status === "error" || status === "interrupted"
        ? "Retry"
        : "Run again";
  const loadError =
    alertQuery.error instanceof ApiError ? alertQuery.error.detail : "Could not load this alert.";

  return (
    <section>
      <EvidencePanel citation={selectedCitation} alert={alert} alertId={alertId} onClose={() => setSelected(null)} />
      <Link to="/investigate" className="font-mono text-xs text-accent hover:underline">
        Back to alert list
      </Link>
      <p className="mt-3 font-mono text-xs tracking-widest text-accent">AEGIS // AI INVESTIGATION</p>
      <h1 className="mt-1 font-mono text-2xl font-semibold text-fg">{alertId}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <aside className="rounded-xl border border-line bg-panel p-5 lg:col-span-1">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Alert details</p>

          {alertQuery.isPending ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-panel-2" />
              ))}
            </div>
          ) : alertQuery.isError ? (
            <div className="mt-4">
              <p className="text-sm text-sev-critical">{loadError}</p>
              <button
                onClick={() => void alertQuery.refetch()}
                className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm text-fg hover:border-accent"
              >
                Retry
              </button>
            </div>
          ) : alert ? (
            <dl className="mt-4 space-y-4">
              <Detail label="Severity">
                <SeverityBadge raw={alert.severity_raw} />
              </Detail>
              <Detail label="Status">
                <StatusBadge status={alert.triage_status} />
              </Detail>
              <Detail label="Time">{formatTimestamp(alert.timestamp)}</Detail>
              <Detail label="Asset">
                <span className="font-mono text-xs">{alert.asset_id}</span>
                <span className="ml-2 font-mono text-[11px] text-muted">{alert.source}</span>
              </Detail>
              <Detail label="Asset criticality">{alert.asset_criticality ?? "unknown"}</Detail>
              <Detail label="MITRE technique">{alert.mitre_technique ?? "-"}</Detail>
              <Detail label="ML triage score">
                <ScoreBar score={alert.false_positive_score} />
              </Detail>
              <Detail label="Description">{alert.description}</Detail>
            </dl>
          ) : null}
        </aside>

        <div className="rounded-xl border border-line bg-panel p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-wider text-muted">Incident brief</p>
            <div className="flex items-center gap-3">
              {streaming ? (
                <button
                  onClick={stop}
                  className="rounded-md border border-sev-critical/40 px-4 py-1.5 text-sm text-sev-critical hover:bg-sev-critical/10"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => void start()}
                  disabled={!alert}
                  className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {startLabel}
                </button>
              )}
            </div>
          </div>

          <p className={`mt-3 font-mono text-xs ${note.cls}`}>
            {note.text}
            {status === "error" && error ? ` ${error}` : ""}
          </p>

          <p className="mt-3 rounded-md border border-st-pending/40 bg-st-pending/10 px-3 py-2 text-xs text-st-pending">
            Mock content: the backend currently streams a fixed sample brief, not the real AI agent.
          </p>

          <div className="mt-4 min-h-48 rounded-md border border-line bg-base p-4">
            {text === "" && status !== "streaming" ? (
              <p className="text-sm text-muted">The incident brief will appear here.</p>
            ) : (
              <BriefView brief={parsed} streaming={streaming} selected={selected} onSelect={setSelected} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function InvestigatePage() {
  const { alertId } = useParams();
  if (!alertId) return <AlertPicker />;
  return <InvestigationView key={alertId} alertId={alertId} />;
}

