import { useEffect } from 'react';
import { useTimeline } from '../api/hooks';
import { formatDateTime, formatDuration } from '../lib/format';
import { Badge, Button, ErrorState, Spinner } from './ui';
import { Timeline } from './Timeline';

export function SessionDrawer({
  sessionId,
  onClose,
}: {
  sessionId: string | null;
  onClose: () => void;
}) {
  const { data, isPending, isError, error } = useTimeline(sessionId);

  // Close on Escape while the popup is open.
  useEffect(() => {
    if (!sessionId) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sessionId, onClose]);

  // Lock body scroll while popup is open
  useEffect(() => {
    if (!sessionId) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-ink/60 backdrop-blur-xs transition-opacity"
      />

      {/* Centered Modal Popup */}
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col rounded-lg border border-hairline bg-surface-card shadow-2xl overflow-hidden">
        <header className="flex items-start justify-between gap-4 border-b border-hairline bg-surface-doc px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Session journey</p>
            <h3 id="session-modal-title" className="truncate font-mono text-sm font-bold text-ink">
              {sessionId}
            </h3>
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
            aria-label="Close dialog"
            className="rounded-md border border-hairline bg-surface-soft px-2.5 py-1 text-xs font-bold text-ink transition-colors hover:bg-hairline-soft"
          >
            ✕ Esc
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isPending && <Spinner label="Loading timeline…" />}
          {isError && <ErrorState error={error} />}
          {data && data.events.length === 0 && (
            <p className="py-10 text-center text-sm text-mute">no data yet</p>
          )}
          {data && data.events.length > 0 && <Timeline events={data.events} />}
        </div>

        <footer className="flex items-center justify-end border-t border-hairline bg-surface-doc px-6 py-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
}
