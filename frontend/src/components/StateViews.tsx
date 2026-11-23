export function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-panel-2" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-sev-critical">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md border border-line px-4 py-2 text-sm text-fg hover:border-accent"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="p-8 text-center">
      <p className="text-sm text-fg">{title}</p>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </div>
  );
}
