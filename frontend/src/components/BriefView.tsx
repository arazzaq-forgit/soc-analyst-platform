import type { BriefLine, Citation, ParsedBrief } from "../lib/citations";
import CitationChip from "./CitationChip";

interface BriefViewProps {
  brief: ParsedBrief;
  streaming: boolean;
  selected: number | null;
  onSelect: (n: number | null) => void;
}

export default function BriefView({ brief, streaming, selected, onSelect }: BriefViewProps) {
  const toggle = (n: number) => onSelect(selected === n ? null : n);

  const chipFor = (c: Citation) =>
    c.valid ? (
      <CitationChip
        label={`[${c.n}]`}
        active={selected === c.n}
        onClick={() => toggle(c.n)}
        title="Show the evidence for this citation"
      />
    ) : (
      <CitationChip label="[?]" bad title="Malformed citation: this entry could not be read" />
    );

  const renderLine = (line: BriefLine, i: number) => {
    if (line.kind === "blank") return <div key={i} className="h-2" />;

    if (line.kind === "heading") {
      return (
        <h2
          key={i}
          className="pt-3 font-mono text-xs font-semibold uppercase tracking-widest text-accent"
        >
          {line.text}
        </h2>
      );
    }

    if (line.kind === "citation" && line.citationN !== undefined) {
      const c = brief.citations[line.citationN - 1];
      if (c) {
        return (
          <p key={i} className="flex flex-wrap items-baseline gap-2 pl-4">
            {chipFor(c)}
            {c.valid ? (
              <span>
                {c.claim} <span className="text-muted">(evidence: {c.field})</span>
              </span>
            ) : (
              <span className="italic text-muted">{c.raw} (malformed citation, could not be read)</span>
            )}
          </p>
        );
      }
    }

    const unverified =
      line.kind === "claim" &&
      brief.complete &&
      line.chips.length === 0 &&
      line.badMarkers.length === 0;

    return (
      <p key={i} className={line.bullet ? "pl-4" : undefined}>
        {line.bullet && <span className="text-muted">- </span>}
        {line.text}
        {line.chips.map((n) => {
          const c = brief.citations[n - 1];
          if (!c) return null;
          return (
            <span key={n} className="ml-1.5">
              {chipFor(c)}
            </span>
          );
        })}
        {line.badMarkers.map((m, k) => (
          <span key={`${m}-${k}`} className="ml-1.5">
            <CitationChip label="[?]" bad title={`Citation ${m} does not match any listed evidence`} />
          </span>
        ))}
        {unverified && (
          <span
            title="No citation supports this statement"
            className="ml-2 rounded border border-st-pending/40 bg-st-pending/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-st-pending"
          >
            Unverified
          </span>
        )}
      </p>
    );
  };

  return (
    <div className="space-y-1 text-sm leading-relaxed text-fg">
      {brief.lines.map(renderLine)}
      {streaming && (
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-accent align-middle" />
      )}
    </div>
  );
}
