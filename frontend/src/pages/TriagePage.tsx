import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAlerts } from "../api/alerts";
import { ApiError } from "../api/client";
import ScoreBar from "../components/ScoreBar";
import SeverityBadge from "../components/SeverityBadge";
import StatusBadge from "../components/StatusBadge";
import SummaryCard from "../components/SummaryCard";
import AlertCharts from "../components/AlertCharts";
import {
  SEVERITY_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  formatTimestamp,
  isNoise,
  normalizeSeverity,
  parseTimestamp,
} from "../lib/alertDisplay";
import type { SeverityLevel } from "../lib/alertDisplay";
import type { Alert, AlertSource, TriageStatus } from "../types";

type SeverityFilter = "all" | "other" | SeverityLevel;

const selectClass =
  "rounded-md border border-line bg-base px-2 py-1.5 font-mono text-xs text-fg outline-none focus:border-accent";

function SkeletonRows() {
  return (
    <div className="space-y-3 p-4" aria-label="Loading alerts">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-panel-2" />
      ))}
    </div>
  );
}

export default function TriagePage() {
  const { data, isPending, isError, error, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetchAlerts(200),
    refetchInterval: 10_000,
  });

  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [status, setStatus] = useState<TriageStatus | "all">("all");
  const [source, setSource] = useState<AlertSource | "all">("all");

  const alerts: Alert[] = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      total: alerts.length,
      critHigh: alerts.filter((a) => {
        const s = normalizeSeverity(a.severity_raw);
        return s === "CRITICAL" || s === "HIGH";
      }).length,
      noise: alerts.filter(isNoise).length,
      pending: alerts.filter((a) => a.triage_status === "pending").length,
    }),
    [alerts],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts
      .filter((a) => {
        if (q) {
          const haystack = [a.alert_id, a.asset_id, a.description, a.mitre_technique ?? ""]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (severity !== "all") {
          const level = normalizeSeverity(a.severity_raw);
          if (severity === "other" ? level !== null : level !== severity) return false;
        }
        if (status !== "all" && a.triage_status !== status) return false;
        if (source !== "all" && a.source !== source) return false;
        return true;
      })
      .sort((a, b) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
  }, [alerts, search, severity, status, source]);

  const filtersActive = search !== "" || severity !== "all" || status !== "all" || source !== "all";

  const clearFilters = () => {
    setSearch("");
    setSeverity("all");
    setStatus("all");
    setSource("all");
  };

  const lastUpdated = dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toLocaleTimeString() : "never";
  const errorMessage = error instanceof ApiError ? error.detail : "Something went wrong.";

  return (
    <section>
      <p className="font-mono text-xs tracking-widest text-accent">AEGIS // TRIAGE QUEUE</p>
      <h1 className="mt-1 text-2xl font-semibold text-fg">Triage Queue</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total queue volume"
          value={counts.total}
          hint="Alerts loaded from the backend"
          tone="info"
        />
        <SummaryCard
          label="Critical / high"
          value={counts.critHigh}
          hint="Based on the alert's raw severity"
          tone="danger"
        />
        <SummaryCard
          label="ML noise reduction"
          value={counts.noise}
          hint="Score of 80% or more, or dismissed"
          tone="good"
        />
        <SummaryCard
          label="Awaiting triage"
          value={counts.pending}
          hint="Status is pending"
          tone="warn"
        />
      </div>

      <AlertCharts alerts={alerts} />

      <div className="mt-6 rounded-xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alert ID, asset, description, MITRE..."
            className="min-w-64 flex-1 rounded-md border border-line bg-base px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-md border border-line px-3 py-2 font-mono text-xs text-fg transition-colors hover:border-accent disabled:opacity-50"
          >
            {isFetching ? "Refreshing..." : "Refresh Feed"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">Filters:</span>
          <select
            aria-label="Severity filter"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
            className={selectClass}
          >
            <option value="all">Severity: All</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="other">Other / unknown</option>
          </select>
          <select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value as TriageStatus | "all")}
            className={selectClass}
          >
            <option value="all">Status: All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Source filter"
            value={source}
            onChange={(e) => setSource(e.target.value as AlertSource | "all")}
            className={selectClass}
          >
            <option value="all">Source: All</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {filtersActive && (
            <button onClick={clearFilters} className="font-mono text-xs text-accent hover:underline">
              Clear filters
            </button>
          )}
          <span className="ml-auto font-mono text-xs text-muted">
            Last updated: {lastUpdated} | auto-refresh 10s
          </span>
        </div>
      </div>

      {isError && data && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-st-pending/40 bg-st-pending/10 px-3 py-2 text-sm text-st-pending"
        >
          Could not refresh ({errorMessage}). Showing data from {lastUpdated}.
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
        {isPending ? (
          <SkeletonRows />
        ) : isError && !data ? (
          <div className="p-8 text-center">
            <p className="text-sm text-sev-critical">Could not load alerts: {errorMessage}</p>
            <button
              onClick={() => void refetch()}
              className="mt-4 rounded-md border border-line px-4 py-2 text-sm text-fg hover:border-accent"
            >
              Retry
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-fg">No alerts in the database yet.</p>
            <p className="mt-2 text-sm text-muted">
              Create one with POST /alerts/ingest in Swagger (http://127.0.0.1:8000/docs), or
              wait for the Ingest Alert page, which comes in the next task.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-fg">No alerts match your search or filters.</p>
            <button onClick={clearFilters} className="mt-3 font-mono text-xs text-accent hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-medium">Alert ID</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Asset / source</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">MITRE</th>
                  <th className="px-4 py-3 font-medium">ML triage score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-b border-line/60 last:border-0 hover:bg-panel-2">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-accent">{a.alert_id}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">
                        {formatTimestamp(a.timestamp)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge raw={a.severity_raw} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-fg">{a.asset_id}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted">{a.source}</p>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-fg" title={a.description}>
                        {a.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {a.mitre_technique ? (
                        <span className="rounded border border-line bg-base px-1.5 py-0.5 font-mono text-[11px] text-muted">
                          {a.mitre_technique}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBar score={a.false_positive_score} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.triage_status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/investigate/${encodeURIComponent(a.alert_id)}`}
                        className="whitespace-nowrap rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent transition-colors hover:bg-accent/20"
                      >
                        Investigate
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isPending && alerts.length > 0 && (
        <p className="mt-2 font-mono text-xs text-muted">
          Showing {visible.length} of {alerts.length} alerts, newest first.
        </p>
      )}
    </section>
  );
}

