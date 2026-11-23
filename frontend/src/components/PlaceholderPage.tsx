interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  items: string[];
}

export default function PlaceholderPage({ title, subtitle, items }: PlaceholderPageProps) {
  return (
    <section>
      <p className="font-mono text-xs tracking-widest text-accent">{subtitle}</p>
      <h1 className="mt-1 text-2xl font-semibold text-fg">{title}</h1>

      <div className="mt-6 rounded-xl border border-dashed border-line bg-panel p-6">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">Coming in a later task</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-fg">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
