export default function BriefView({ text, streaming }: { text: string; streaming: boolean }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1 text-sm leading-relaxed text-fg">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="pt-3 font-mono text-xs font-semibold uppercase tracking-widest text-accent"
            >
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <p key={i} className="pl-4">
              <span className="text-muted">- </span>
              {line.slice(2)}
            </p>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-2" />;
        return <p key={i}>{line}</p>;
      })}
      {streaming && (
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-accent align-middle" />
      )}
    </div>
  );
}
