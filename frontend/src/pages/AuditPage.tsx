import PlaceholderPage from "../components/PlaceholderPage";

export default function AuditPage() {
  return (
    <PlaceholderPage
      title="Audit Trail"
      subtitle="AEGIS // AUDIT TRAIL"
      items={[
        "Every AI decision and user action, newest first",
        "Needs a new backend endpoint first: the audit_logs table exists but nothing serves it yet",
      ]}
    />
  );
}
