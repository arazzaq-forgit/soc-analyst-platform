import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAlert } from "../api/alerts";
import type { ReactNode } from "react";
import { formatTimestamp } from "../lib/alertDisplay";
import type { Citation } from "../lib/citations";
import type { Alert } from "../types";

interface EvidencePanelProps {
  citation: Citation | null;
  alert: Alert | undefined;
  alertId: string;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">{children}</dd>
    </div>
  );
}

export default function EvidencePanel({ citation, onClose }: EvidencePanelProps) {
  const cited = useQuery({
    queryKey: ["alert", citation?.alertId],
    queryFn: () => fetchAlert(citation!.alertId),
    enabled: !!citation,
    retry: false,
  });
  const alert = cited.data;
  const notFound = cited.isError;
  useEffect(() => {
    if (!citation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [citation, onClose]);

  if (!citation || !citation.valid) return null;

  return (
    <aside
      role="dialog"
      aria-label={`Evidence for citation ${citation.n}`}
      className="fixed inset-y-0 right-0 z-30 w-full max-w-sm overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Evidence [{citation.n}]
        </p>
        <button
          onClick={onClose}
          className="rounded-md border border-line px-3 py-1 text-sm text-fg hover:border-accent"
        >
          Close
        </button>
      </div>

      <dl className="mt-6 space-y-4">
        <Row label="Claim">{citation.claim}</Row>
        <Row label="Cited alert">
          <span className="font-mono text-xs">{citation.alertId}</span>
        </Row>
        <Row label="Source">
          {alert ? (
            <>
              {alert.source}
              {alert.source_system ? (
                <span className="ml-2 font-mono text-xs text-muted">{alert.source_system}</span>
              ) : null}
            </>
          ) : notFound ? (
            <span className="text-sev-critical">Not found</span>
          ) : (
            <span className="text-muted">Loading...</span>
          )}
        </Row>
        <Row label="Severity">
          {alert ? alert.severity_raw : <span className="text-muted">Loading...</span>}
        </Row>
        <Row label="MITRE technique">
          {alert ? (alert.mitre_technique || "-") : <span className="text-muted">Loading...</span>}
        </Row>
        <Row label="Timestamp">
          {alert ? formatTimestamp(alert.timestamp) : <span className="text-muted">Loading...</span>}
        </Row>
        <Row label="Asset">
          {alert ? <span className="font-mono text-xs">{alert.asset_id}</span> : "-"}
        </Row>
      </dl>

      {notFound && (
        <p className="mt-6 rounded-md border border-sev-critical/40 bg-sev-critical/10 px-3 py-2 text-xs text-sev-critical">
          The brief cites {citation.alertId}, but no alert with that ID exists in the database. Treat
          this claim as unverified.
        </p>
      )}

      <p className="mt-6 rounded-md border border-line bg-base px-3 py-2 text-xs text-muted">
        The log text itself is not shown. Raw logs are stored encrypted and the API does not return
        them yet, so this panel shows the metadata the citation points to. Showing the exact log
        line needs a new backend endpoint.
      </p>
    </aside>
  );
}
