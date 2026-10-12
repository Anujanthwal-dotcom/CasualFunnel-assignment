import type { TimelineEvent } from '../types';
import { formatClock, shortUrl } from '../lib/format';

function isClick(event: TimelineEvent): boolean {
  return event.event_type === 'click';
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative ml-2 border-l border-slate-800">
      {events.map((event, index) => {
        const click = isClick(event);
        return (
          <li key={`${event.timestamp}-${index}`} className="relative mb-4 pl-6">
            <span
              aria-hidden
              className={`absolute -left-[9px] top-1.5 grid h-4 w-4 place-items-center rounded-full ring-4 ring-slate-950 ${
                click ? 'bg-sky-400' : 'bg-indigo-500'
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  click ? 'bg-sky-500/15 text-sky-300' : 'bg-indigo-500/15 text-indigo-300'
                }`}
              >
                {click ? 'click' : 'page_view'}
              </span>
              <span className="text-xs text-slate-500">{formatClock(event.timestamp)}</span>
              {click && (event.x != null || event.y != null) && (
                <span className="font-mono text-xs text-slate-500">
                  ({event.x}, {event.y})
                </span>
              )}
            </div>
            <p className="mt-1 truncate font-mono text-xs text-slate-300" title={event.page_url}>
              {shortUrl(event.page_url, 60)}
            </p>
            {click && typeof event.metadata?.text === 'string' && event.metadata.text && (
              <p className="mt-0.5 text-xs text-slate-500">“{event.metadata.text}”</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
