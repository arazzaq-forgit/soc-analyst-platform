import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ingestAlert } from "../api/alerts";
import type { AlertIngestPayload } from "../api/alerts";
import { ApiError } from "../api/client";
import { SOURCE_OPTIONS, STATUS_LABELS } from "../lib/alertDisplay";
import type { Alert, AlertSource, AssetCriticality } from "../types";

const CRITICALITY_OPTIONS: AssetCriticality[] = ["low", "medium", "high", "unknown"];

interface FormState {
  alertId: string;
  timestamp: string;
  source: AlertSource;
  sourceSystem: string;
  severity: string;
  assetId: string;
  criticality: AssetCriticality;
  description: string;
  mitre: string;
  rawLog: string;
  related: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Format a Date for <input type="datetime-local"> in the viewer's local time.
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyForm(): FormState {
  return {
    alertId: "",
    timestamp: toLocalInput(new Date()),
    source: "SIEM",
    sourceSystem: "",
    severity: "",
    assetId: "",
    criticality: "unknown",
    description: "",
    mitre: "",
    rawLog: "",
    related: "",
  };
}

function sampleForm(): FormState {
  return {
    alertId: "",
    timestamp: toLocalInput(new Date()),
    source: "SIEM",
    sourceSystem: "sample-form",
    severity: "high",
    assetId: "host-web-03",
    criticality: "high",
    description: "Sample: repeated failed SSH logins from one external IP followed by a successful login",
    mitre: "T1110",
    rawLog:
      "Nov  8 13:02:11 host-web-03 sshd[1234]: Failed password for root from 203.0.113.7 port 51234 ssh2",
    related: "",
  };
}

function errorMessage(err: unknown, alertId: string): string {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return `An alert with ID "${alertId}" already exists. Use a different Alert ID, or leave it empty to generate one.`;
    }
    if (err.status === 422) {
      return `The server rejected some fields: ${err.detail}`;
    }
    if (err.status === 403) return "You do not have permission to ingest alerts.";
    return err.detail;
  }
  return "Something went wrong. Please try again.";
}

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-base px-3 py-2 text-sm text-fg outline-none focus:border-accent";
const labelClass = "block text-xs font-mono uppercase tracking-wider text-muted";

export default function IngestPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [created, setCreated] = useState<Alert | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ingestAlert,
    onSuccess: (alert) => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setCreated(alert);
      setForm(emptyForm());
    },
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setCreated(null);
    setLocalError(null);
    mutation.reset();

    const when = new Date(form.timestamp);
    if (Number.isNaN(when.getTime())) {
      setLocalError("Please enter a valid timestamp.");
      return;
    }
    if (!form.severity.trim() || !form.assetId.trim() || !form.description.trim() || !form.rawLog.trim()) {
      setLocalError("Severity, asset ID, description and raw log are required.");
      return;
    }

    const payload: AlertIngestPayload = {
      timestamp: when.toISOString(),
      source: form.source,
      source_system: form.sourceSystem.trim() || null,
      severity_raw: form.severity.trim(),
      asset_id: form.assetId.trim(),
      asset_criticality: form.criticality,
      description: form.description.trim(),
      mitre_technique: form.mitre.trim() || null,
      raw_log: form.rawLog,
      related_alert_ids: form.related
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== ""),
    };
    if (form.alertId.trim()) payload.alert_id = form.alertId.trim();

    mutation.mutate(payload);
  };

  const apiError = mutation.isError ? errorMessage(mutation.error, form.alertId.trim()) : null;
  const shownError = localError ?? apiError;

  return (
    <section>
      <p className="font-mono text-xs tracking-widest text-accent">AEGIS // INGEST</p>
      <h1 className="mt-1 text-2xl font-semibold text-fg">Ingest Alert</h1>
      <p className="mt-1 text-sm text-muted">
        Send a new alert to the backend. It is stored as Pending until it is triaged.
      </p>

      {created && (
        <div
          role="status"
          className="mt-6 rounded-md border border-st-resolved/40 bg-st-resolved/10 px-4 py-3 text-sm text-st-resolved"
        >
          <p>
            Alert created: <span className="font-mono font-semibold">{created.alert_id}</span> (
            {STATUS_LABELS[created.triage_status] ?? created.triage_status})
          </p>
          <div className="mt-2 flex gap-4 font-mono text-xs">
            <Link to={`/investigate/${encodeURIComponent(created.alert_id)}`} className="text-accent hover:underline">
              Investigate this alert
            </Link>
            <Link to="/" className="text-accent hover:underline">
              View in Triage Queue
            </Link>
          </div>
        </div>
      )}

      {shownError && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-sev-critical/40 bg-sev-critical/10 px-4 py-3 text-sm text-sev-critical"
        >
          {shownError}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 rounded-xl border border-line bg-panel p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Alert details</p>
          <button
            type="button"
            onClick={() => {
              setForm(sampleForm());
              setCreated(null);
              setLocalError(null);
              mutation.reset();
            }}
            className="rounded-md border border-line px-3 py-1.5 font-mono text-xs text-fg transition-colors hover:border-accent"
          >
            Fill with sample alert
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="alertId" className={labelClass}>
              Alert ID (optional)
            </label>
            <input
              id="alertId"
              value={form.alertId}
              onChange={(e) => update("alertId", e.target.value)}
              placeholder="Leave empty to auto-generate"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="timestamp" className={labelClass}>
              Timestamp (your local time)
            </label>
            <input
              id="timestamp"
              type="datetime-local"
              required
              value={form.timestamp}
              onChange={(e) => update("timestamp", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="source" className={labelClass}>
              Source
            </label>
            <select
              id="source"
              value={form.source}
              onChange={(e) => update("source", e.target.value as AlertSource)}
              className={inputClass}
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sourceSystem" className={labelClass}>
              Source system (optional)
            </label>
            <input
              id="sourceSystem"
              value={form.sourceSystem}
              onChange={(e) => update("sourceSystem", e.target.value)}
              placeholder="e.g. splunk-prod"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="severity" className={labelClass}>
              Severity
            </label>
            <input
              id="severity"
              required
              value={form.severity}
              onChange={(e) => update("severity", e.target.value)}
              placeholder="e.g. high, critical, medium, low"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="criticality" className={labelClass}>
              Asset criticality
            </label>
            <select
              id="criticality"
              value={form.criticality}
              onChange={(e) => update("criticality", e.target.value as AssetCriticality)}
              className={inputClass}
            >
              {CRITICALITY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="assetId" className={labelClass}>
              Asset ID
            </label>
            <input
              id="assetId"
              required
              value={form.assetId}
              onChange={(e) => update("assetId", e.target.value)}
              placeholder="e.g. host-web-03"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="mitre" className={labelClass}>
              MITRE technique (optional)
            </label>
            <input
              id="mitre"
              value={form.mitre}
              onChange={(e) => update("mitre", e.target.value)}
              placeholder="e.g. T1110"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className={labelClass}>
              Description
            </label>
            <input
              id="description"
              required
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="rawLog" className={labelClass}>
              Raw log
            </label>
            <textarea
              id="rawLog"
              required
              rows={5}
              value={form.rawLog}
              onChange={(e) => update("rawLog", e.target.value)}
              className={`${inputClass} font-mono text-xs`}
            />
            <p className="mt-1 text-xs text-muted">
              Stored encrypted in the database. It is never shown in the alert list.
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="related" className={labelClass}>
              Related alert IDs (optional, comma separated)
            </label>
            <input
              id="related"
              value={form.related}
              onChange={(e) => update("related", e.target.value)}
              placeholder="e.g. alrt_demo_001, alrt_demo_002"
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? "Sending..." : "Ingest alert"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm());
              setLocalError(null);
              mutation.reset();
            }}
            className="rounded-md border border-line px-4 py-2 text-sm text-fg hover:border-accent"
          >
            Clear form
          </button>
        </div>
      </form>
    </section>
  );
}
