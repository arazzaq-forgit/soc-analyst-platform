import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/useAuth";

function messageFor(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Wrong email or password.";
    if (err.status === 429) {
      return "Too many login attempts. Wait about a minute, then try again.";
    }
    if (err.status === 422) return "Please enter a valid email address and password.";
    return err.detail;
  }
  return "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(messageFor(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-xl border border-line bg-panel p-8 shadow-xl"
      >
        <p className="font-mono text-xs tracking-widest text-accent">AEGIS // SOC ANALYST PLATFORM</p>
        <h1 className="mt-2 text-2xl font-semibold text-fg">Sign in</h1>
        <p className="mt-1 text-sm text-muted">AI triage and RAG investigation</p>

        <label className="mt-6 block text-xs font-mono uppercase tracking-wider text-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-base px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />

        <label className="mt-4 block text-xs font-mono uppercase tracking-wider text-muted" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-base px-3 py-2 text-sm text-fg outline-none focus:border-accent"
        />

        {error && (
          <p role="alert" className="mt-4 rounded-md border border-sev-critical/40 bg-sev-critical/10 px-3 py-2 text-sm text-sev-critical">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
