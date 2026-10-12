import { useEffect, useState } from 'react';
import { useSessions, type SessionsParams } from '../api/hooks';
import type { SessionSort, SortOrder } from '../types';
import { formatDateTime, formatDuration, timeAgo } from '../lib/format';
import { Badge, Card, EmptyState, ErrorState, Spinner } from './ui';
import { SessionDrawer } from './SessionDrawer';

const PAGE_SIZE = 25;

const COLUMNS: Array<{ key: SessionSort; label: string; right?: boolean }> = [
  { key: 'lastSeen', label: 'Last seen' },
  { key: 'eventCount', label: 'Events', right: true },
  { key: 'clickCount', label: 'Clicks', right: true },
  { key: 'pageViewCount', label: 'Page views', right: true },
  { key: 'durationMs', label: 'Duration', right: true },
  { key: 'firstSeen', label: 'Started', right: true },
];

export function SessionsView() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SessionSort>('lastSeen');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [selected, setSelected] = useState<string | null>(null);

  // Debounce typing so we don't fire an aggregation query per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setOffset(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const params: SessionsParams = { limit: PAGE_SIZE, offset, sort, order, search: query };
  const { data, isPending, isError, error, isFetching } = useSessions(params);

  const toggleSort = (key: SessionSort) => {
    if (sort === key) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(key);
      setOrder('desc');
    }
    setOffset(0);
  };

  const total = data?.meta.total ?? 0;
  const rows = data?.data ?? [];

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Sessions</h2>
          <p className="mt-0.5 text-xs text-mute">
            {isFetching ? 'Updating… ' : ''}
            {total} recorded session{total === 1 ? '' : 's'} across all pages
          </p>
        </div>
        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search sessions</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search session id…"
            className="w-full rounded-md border border-hairline bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-ash transition-colors focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </label>
      </div>

      <Card className="overflow-hidden">
        {isPending && <Spinner label="Loading sessions…" />}
        {isError && <ErrorState error={error} />}

        {!isPending && !isError && rows.length === 0 && (
          <EmptyState title="no data yet" />
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-hairline bg-surface-soft text-xs font-bold uppercase tracking-wider text-charcoal">
                <tr>
                  <th className="px-4 py-3 font-bold">Session</th>
                  {COLUMNS.map((column) => {
                    const active = sort === column.key;
                    return (
                      <th
                        key={column.key}
                        className={`px-4 py-3 font-bold ${column.right ? 'text-right' : 'text-left'}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${
                            active ? 'text-link-blue' : ''
                          }`}
                        >
                          {column.label}
                          <span aria-hidden>{active ? (order === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-right font-bold">Pages</th>
                  <th className="px-4 py-3 text-right font-bold">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft">
                {rows.map((session) => (
                  <tr
                    key={session.sessionId}
                    onClick={() => setSelected(session.sessionId)}
                    title="Click to view session timeline"
                    className="cursor-pointer transition-colors hover:bg-surface-soft/80"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink">
                      <span className="font-bold text-link-blue hover:underline">
                        {session.sessionId.slice(0, 13)}…
                      </span>
                      <span className="ml-1.5 font-sans text-mute">{timeAgo(session.lastSeen)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {session.eventCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="sky">{session.clickCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="indigo">{session.pageViewCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-body">
                      {formatDuration(session.durationMs)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-mute">
                      {formatDateTime(session.firstSeen)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-mute">
                      {session.pageCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(session.sessionId);
                        }}
                        className="rounded border border-hairline bg-surface-soft px-2 py-0.5 text-xs font-bold text-ink transition-colors hover:bg-hairline-soft"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-xs text-mute">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="rounded-md border border-hairline bg-surface-soft px-3 py-1.5 font-bold text-ink transition-colors hover:bg-hairline-soft disabled:cursor-not-allowed disabled:border-hairline-soft disabled:text-ash"
          >
            ← Previous
          </button>
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="rounded-md border border-hairline bg-surface-soft px-3 py-1.5 font-bold text-ink transition-colors hover:bg-hairline-soft disabled:cursor-not-allowed disabled:border-hairline-soft disabled:text-ash"
          >
            Next →
          </button>
        </div>
      )}

      <SessionDrawer sessionId={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
