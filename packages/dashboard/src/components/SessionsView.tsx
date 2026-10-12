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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Sessions</h2>
          <p className="text-xs text-slate-400">
            {isFetching ? 'Updating…' : ''}
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
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
      </div>

      <Card className="overflow-hidden">
        {isPending && <Spinner label="Loading sessions…" />}
        {isError && <ErrorState error={error} />}

        {!isPending && !isError && rows.length === 0 && (
          <EmptyState
            title="No sessions yet"
            hint="Open demo/index.html in your browser (with the backend running) to generate events."
          />
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Session</th>
                  {COLUMNS.map((column) => {
                    const active = sort === column.key;
                    return (
                      <th
                        key={column.key}
                        className={`px-4 py-3 font-medium ${column.right ? 'text-right' : 'text-left'}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className={`inline-flex items-center gap-1 transition hover:text-slate-200 ${
                            active ? 'text-indigo-300' : ''
                          }`}
                        >
                          {column.label}
                          <span aria-hidden>{active ? (order === 'asc' ? '↑' : '↓') : '↕'}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-right font-medium">Pages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((session) => (
                  <tr
                    key={session.sessionId}
                    onClick={() => setSelected(session.sessionId)}
                    className="cursor-pointer transition hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {session.sessionId.slice(0, 13)}…
                      <span className="ml-1 font-sans text-slate-500">{timeAgo(session.lastSeen)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-200">
                      {session.eventCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="sky">{session.clickCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone="indigo">{session.pageViewCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {formatDuration(session.durationMs)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {formatDateTime(session.firstSeen)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{session.pageCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="rounded-lg border border-slate-700 px-3 py-1.5 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="rounded-lg border border-slate-700 px-3 py-1.5 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      <SessionDrawer sessionId={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
