import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, updateUserRole } from "../api/admin";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";
import type { Role, User } from "../types";

const ROLES: Role[] = ["analyst", "admin"];

interface PendingChange {
  user: User;
  role: Role;
}

function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === "admin"
      ? "border-st-cleared/40 bg-st-cleared/15 text-st-cleared"
      : "border-st-investigating/40 bg-st-investigating/15 text-st-investigating";
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {role}
    </span>
  );
}

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "You do not have permission to change roles. Admin access is required.";
    if (err.status === 404) return "That user was not found. They may have been removed. The list has been refreshed.";
    if (err.status === 0) return err.detail;
    return err.detail;
  }
  return "Something went wrong. Please try again.";
}

export default function AdminPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();

  const users = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const [pending, setPending] = useState<PendingChange | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ user, role }: PendingChange) => updateUserRole(user.id, role),
    onSuccess: (updated) => {
      setFailure(null);
      setNotice(`${updated.email} is now ${updated.role}.`);
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      setNotice(null);
      setFailure(messageFor(err));
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const choose = (user: User, role: Role) => {
    setNotice(null);
    setFailure(null);
    if (role === user.role) {
      setPending(null);
      return;
    }
    setPending({ user, role });
  };

  const sorted = [...(users.data ?? [])].sort((a, b) => a.id - b.id);
  const loadError =
    users.error instanceof ApiError ? users.error.detail : "Could not load users.";
  const adminCount = sorted.filter((u) => u.role === "admin").length;

  return (
    <section>
      <p className="font-mono text-xs tracking-widest text-accent">AEGIS // ADMIN</p>
      <h1 className="mt-1 text-2xl font-semibold text-fg">Admin RBAC</h1>
      <p className="mt-1 text-sm text-muted">
        Promote or demote users. Self-registered accounts always start as analysts.
      </p>

      {notice && (
        <p
          role="status"
          className="mt-6 rounded-md border border-st-resolved/40 bg-st-resolved/10 px-4 py-3 text-sm text-st-resolved"
        >
          {notice}
        </p>
      )}
      {failure && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-sev-critical/40 bg-sev-critical/10 px-4 py-3 text-sm text-sev-critical"
        >
          {failure}
        </p>
      )}

      {pending && (
        <div
          role="alertdialog"
          aria-label="Confirm role change"
          className="mt-6 rounded-md border border-st-pending/40 bg-st-pending/10 px-4 py-3"
        >
          <p className="text-sm text-fg">
            Change <span className="font-mono">{pending.user.email}</span> from{" "}
            <span className="font-semibold">{pending.user.role}</span> to{" "}
            <span className="font-semibold">{pending.role}</span>?
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => mutation.mutate(pending)}
              disabled={mutation.isPending}
              className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {mutation.isPending ? "Saving..." : "Confirm change"}
            </button>
            <button
              onClick={() => setPending(null)}
              disabled={mutation.isPending}
              className="rounded-md border border-line px-4 py-1.5 text-sm text-fg hover:border-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-panel">
        {users.isPending ? (
          <div className="space-y-3 p-4" aria-label="Loading users">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-panel-2" />
            ))}
          </div>
        ) : users.isError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-sev-critical">{loadError}</p>
            <button
              onClick={() => void users.refetch()}
              className="mt-4 rounded-md border border-line px-4 py-2 text-sm text-fg hover:border-accent"
            >
              Retry
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">No users found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Change role</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const isMe = me?.id === u.id;
                return (
                  <tr key={u.id} className="border-b border-line/60 last:border-0 hover:bg-panel-2">
                    <td className="px-4 py-3 font-mono text-xs text-muted">{u.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-fg">
                      {u.email}
                      {isMe && <span className="ml-2 text-accent">(you)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      {isMe ? (
                        <span className="text-xs text-muted">
                          You cannot change your own role.
                        </span>
                      ) : (
                        <select
                          aria-label={`Role for ${u.email}`}
                          value={pending?.user.id === u.id ? pending.role : u.role}
                          disabled={mutation.isPending}
                          onChange={(e) => choose(u, e.target.value as Role)}
                          className="rounded-md border border-line bg-base px-2 py-1.5 font-mono text-xs text-fg outline-none focus:border-accent"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {users.data && (
        <p className="mt-2 font-mono text-xs text-muted">
          {sorted.length} users, {adminCount} admin{adminCount === 1 ? "" : "s"}.
        </p>
      )}
    </section>
  );
}
