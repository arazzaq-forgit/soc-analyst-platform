import PlaceholderPage from "../components/PlaceholderPage";

export default function TriagePage() {
  return (
    <PlaceholderPage
      title="Triage Queue"
      subtitle="AEGIS // TRIAGE QUEUE"
      items={[
        "Summary cards: total queue, critical/high, ML noise reduction, awaiting triage",
        "Search and filters (severity, status, source)",
        "Live alert table from GET /alerts, refreshed every 10 seconds",
      ]}
    />
  );
}
