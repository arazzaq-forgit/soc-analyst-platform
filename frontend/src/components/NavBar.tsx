import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Triage Queue", end: true },
  { to: "/investigate", label: "AI Investigation Studio" },
  { to: "/ingest", label: "Ingest Alert" },
  { to: "/audit", label: "Audit Trail" },
  { to: "/admin", label: "Admin RBAC", adminOnly: true },
];

const linkBase =
  "whitespace-nowrap rounded-md border px-3 py-2 text-sm transition-colors";
const linkActive = "border-accent/40 bg-accent/10 text-accent";
const linkIdle = "border-transparent text-muted hover:text-fg";

export default function NavBar() {
  const { user, isAdmin, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  const roleClass =
    user?.role === "admin"
      ? "bg-st-cleared/15 text-st-cleared border-st-cleared/40"
      : "bg-st-investigating/15 text-st-investigating border-st-investigating/40";

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-panel">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <div className="shrink-0">
          <p className="font-mono text-lg font-bold tracking-wider text-fg">AEGIS</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            AI triage and RAG investigation
          </p>
        </div>

        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Main">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-xs text-fg">{user?.email}</p>
            <span
              className={`mt-0.5 inline-block rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${roleClass}`}
            >
              {user?.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-line px-3 py-2 text-sm text-fg transition-colors hover:border-accent"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
