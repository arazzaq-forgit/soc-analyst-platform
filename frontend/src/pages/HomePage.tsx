import { useAuth } from "../auth/useAuth";

export default function HomePage() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-panel p-8">
        <p className="font-mono text-xs tracking-widest text-accent">AEGIS // LOGGED IN</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Email</dt>
            <dd className="font-mono text-fg">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Role</dt>
            <dd className="font-mono text-fg">{user?.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Admin</dt>
            <dd className="font-mono text-fg">{isAdmin ? "yes" : "no"}</dd>
          </div>
        </dl>
        <button
          onClick={logout}
          className="mt-6 w-full rounded-md border border-line px-4 py-2 text-sm text-fg hover:border-accent"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
