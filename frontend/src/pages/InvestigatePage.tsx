import { useParams } from "react-router-dom";
import PlaceholderPage from "../components/PlaceholderPage";

export default function InvestigatePage() {
  const { alertId } = useParams();

  return (
    <div>
      {alertId && (
        <p className="mb-4 rounded-md border border-line bg-panel px-3 py-2 font-mono text-xs text-muted">
          Selected alert: <span className="text-accent">{alertId}</span>
        </p>
      )}
      <PlaceholderPage
        title="AI Investigation Studio"
        subtitle="AEGIS // AI INVESTIGATION"
        items={[
          "Alert details on the left",
          "Incident brief streaming in live on the right",
          "Evidence and citations for every claim",
        ]}
      />
    </div>
  );
}
