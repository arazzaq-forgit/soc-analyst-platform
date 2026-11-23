interface BackendPendingProps {
  title: string;
  subtitle: string;
  summary: string;
  exists: string[];
  missing: string[];
}

export default function BackendPending({ title, subtitle, summary, exists, missing }: BackendPendingProps) {
  return (
    <section>
      <p className="font-mono text-xs tracking-widest text-accent">{subtitle}</p>
      <h1 className="mt-1 text-2xl font-semibold text-fg">{title}</h1>
      <p className="mt-1 text-sm text-muted">{summary}</p>

      <div className="mt-6 rounded-xl border border-st-pending/40 bg-st-pending/10 p-5">
        <p className="font-mono text-xs uppercase tracking-wider text-st-pending">
          Backend endpoint not built yet
        </p>
        <p className="mt-2 text-sm text-fg">
          This page has nothing to show because the backend does not serve this data yet. No sample
          data is shown on purpose.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Already in place</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg">
            {exists.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Still needed</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg">
            {missing.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
