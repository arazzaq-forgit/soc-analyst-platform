import PlaceholderPage from "../components/PlaceholderPage";

export default function IngestPage() {
  return (
    <PlaceholderPage
      title="Ingest Alert"
      subtitle="AEGIS // INGEST"
      items={[
        "A form that sends a new alert to POST /alerts/ingest",
        "A sample-alert button for quick testing",
        "Clear messages for duplicates (409) and bad input (422)",
      ]}
    />
  );
}
