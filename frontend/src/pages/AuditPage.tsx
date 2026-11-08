import BackendPending from "../components/BackendPending";

export default function AuditPage() {
  return (
    <BackendPending
      title="Audit Trail"
      subtitle="AEGIS // AUDIT TRAIL"
      summary="Every AI decision and user action, newest first."
      exists={[
        "An audit_logs table in the database",
        "Alert ingestion already writes an alert_ingested entry",
      ]}
      missing={[
        "An API endpoint that lists audit entries (not designed yet)",
        "Audit entries for classifier scores, agent output and citations (Phase 2)",
        "Saving RBAC denials to audit_logs (currently only logged to a file)",
      ]}
    />
  );
}
