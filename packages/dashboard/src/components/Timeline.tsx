import type { TimelineEvent } from '../types';
import { formatClock, shortUrl } from '../lib/format';

function isClick(event: TimelineEvent): boolean {
  return event.event_type === 'click';
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative ml-2 border-l border-hairline">
      {events.map((event, index) => {
        const click = isClick(event);
        return (
          <li key={`${event.timestamp}-${index}`} className="relative mb-5 pl-6">
            <span
              aria-hidden
              className={`absolute -left-[9px] top-1.5 grid h-4 w-4 place-items-center rounded-full border border-hairline ring-4 ring-surface-card ${
                click ? 'bg-primary' : 'bg-accent-purple'
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-xs border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  click
                    ? 'border-accent-blue/30 bg-accent-blue-soft text-link-blue'
                    : 'border-accent-purple/30 bg-accent-purple-soft text-accent-purple'
                }`}
              >
                {click ? 'click' : 'page_view'}
              </span>
              <span className="text-xs font-medium text-mute">{formatClock(event.timestamp)}</span>
              {click && (event.x != null || event.y != null) && (
                <span className="rounded-xs border border-hairline-soft bg-surface-soft px-1 py-0.5 font-mono text-[11px] text-body">
                  ({event.x}, {event.y})
                </span>
              )}
            </div>
            <p className="mt-1.5 truncate font-mono text-xs text-ink" title={event.page_url}>
              {shortUrl(event.page_url, 60)}
            </p>
            {click && typeof event.metadata?.text === 'string' && event.metadata.text && (
              <p className="mt-1 text-xs text-charcoal">
                Target text: <span className="font-semibold text-ink">“{event.metadata.text}”</span>
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
