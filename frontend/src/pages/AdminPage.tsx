import PlaceholderPage from "../components/PlaceholderPage";

export default function AdminPage() {
  return (
    <PlaceholderPage
      title="Admin RBAC"
      subtitle="AEGIS // ADMIN"
      items={[
        "List of users with their roles",
        "Role change dropdown (admins only)",
      ]}
    />
  );
}
