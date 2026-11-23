interface CitationChipProps {
  label: string;
  active?: boolean;
  bad?: boolean;
  title?: string;
  onClick?: () => void;
}

export default function CitationChip({
  label,
  active = false,
  bad = false,
  title,
  onClick,
}: CitationChipProps) {
  const base =
    "inline-block rounded border px-1.5 py-0.5 align-baseline font-mono text-[11px] leading-none";

  if (bad || !onClick) {
    return (
      <span title={title} className={`${base} border-line bg-panel-2 text-muted`}>
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`${base} transition-colors ${
        active
          ? "border-accent bg-accent text-black"
          : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
      }`}
    >
      {label}
    </button>
  );
}
