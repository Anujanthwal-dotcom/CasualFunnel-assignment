import { useEffect } from 'react';
import { useTimeline } from '../api/hooks';
import { formatDateTime, formatDuration } from '../lib/format';
import { Badge, ErrorState, Spinner } from './ui';
import { Timeline } from './Timeline';

export function SessionDrawer({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const { data, isPending, isError, error } = useTimeline(sessionId);

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!sessionId) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sessionId, onClose]);

  if (!sessionId) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close session detail"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Session journey</p>
            <h3 className="truncate font-mono text-sm text-slate-100">{sessionId}</h3>
            {data && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="indigo">{data.count} events</Badge>
                <Badge tone="sky">{formatDuration(data.durationMs)}</Badge>
                {data.count > 0 && (
                  <Badge tone="emerald">{formatDateTime(data.events[0]?.timestamp)}</Badge>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            ✕ Esc
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isPending && <Spinner label="Loading timeline…" />}
          {isError && <ErrorState error={error} />}
          {data && data.events.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">No events recorded.</p>
          )}
          {data && data.events.length > 0 && <Timeline events={data.events} />}
        </div>
      </aside>
    </div>
  );
}
