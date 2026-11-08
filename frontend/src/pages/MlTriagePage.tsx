import BackendPending from "../components/BackendPending";

export default function MlTriagePage() {
  return (
    <BackendPending
      title="ML Triage Engine"
      subtitle="AEGIS // ML TRIAGE"
      summary="Classifier status, thresholds and model confidence."
      exists={[
        "A false_positive_score field on every alert",
        "The score bars and score chart on the Triage Queue",
      ]}
      missing={[
        "Ghouse's real classifier connected to ingestion (Phase 2)",
        "Triage threshold logic that routes alerts to the investigation agent",
        "An API endpoint for model and threshold information (not designed yet)",
      ]}
    />
  );
}
