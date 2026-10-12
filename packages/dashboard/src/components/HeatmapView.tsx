import { useState } from 'react';
import { useHeatmap, usePages } from '../api/hooks';
import { formatNumber, shortUrl } from '../lib/format';
import { Badge, Card, EmptyState, ErrorState, Spinner } from './ui';
import { HeatmapCanvas, type HeatmapMode } from './HeatmapCanvas';

export function HeatmapView() {
  const pages = usePages();
  const [pageUrl, setPageUrl] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<HeatmapMode>('dots');

  const heatmap = useHeatmap(pageUrl);
  const selectedPage = pages.data?.find((page) => page.pageUrl === pageUrl);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Click heatmap</h2>
          <p className="text-xs text-slate-400">
            Click coordinates captured across sessions, scaled to the viewport they were recorded in.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Page URL
            <select
              value={pageUrl ?? ''}
              onChange={(event) => setPageUrl(event.target.value || undefined)}
              className="min-w-[16rem] max-w-md rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All pages</option>
              {pages.data?.map((page) => (
                <option key={page.pageUrl} value={page.pageUrl}>
                  {shortUrl(page.pageUrl, 60)} ({page.clickCount} clicks)
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1 text-xs text-slate-400">
            Render
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-900 p-1">
              {(['dots', 'grid'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={
                    'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ' +
                    (mode === option
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200')
                  }
                >
                  {option === 'dots' ? 'Dots' : 'Density grid'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Click points" value={formatNumber(heatmap.data?.total)} />
        <Metric label="Viewport" value={heatmap.data ? `${heatmap.data.bounds.width}×${heatmap.data.bounds.height}` : '—'} />
        <Metric label="Distinct pages" value={formatNumber(pages.data?.length)} />
        <Metric
          label="Clicks on page"
          value={formatNumber(selectedPage ? selectedPage.clickCount : undefined)}
        />
      </div>

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs text-slate-400" title={pageUrl ?? 'All pages'}>
            {pageUrl ? shortUrl(pageUrl, 80) : 'All pages'}
          </p>
          <div className="flex items-center gap-2">
            {heatmap.data?.truncated && <Badge tone="amber">showing a sample</Badge>}
            {heatmap.isFetching && !heatmap.isPending && <Badge tone="slate">updating…</Badge>}
            <Legend mode={mode} />
          </div>
        </div>

        {heatmap.isPending && <Spinner label="Loading clicks…" />}
        {heatmap.isError && <ErrorState error={heatmap.error} />}
        {heatmap.data && heatmap.data.points.length === 0 && (
          <EmptyState
            title="No clicks for this selection"
            hint="Generate clicks on the demo page, or pick a different page URL."
          />
        )}
        {heatmap.data && heatmap.data.points.length > 0 && (
          <HeatmapCanvas points={heatmap.data.points} bounds={heatmap.data.bounds} mode={mode} />
        )}
      </Card>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </Card>
  );
}

function Legend({ mode }: { mode: HeatmapMode }) {
  const gradient =
    mode === 'grid'
      ? 'linear-gradient(90deg, rgba(56,189,248,0.25), rgba(99,102,241,0.6), rgba(244,63,94,0.9))'
      : 'linear-gradient(90deg, rgba(56,189,248,0.6), rgba(99,102,241,0.6), rgba(168,85,247,0.6))';
  return (
    <span className="flex items-center gap-2 text-[11px] text-slate-500">
      low
      <span className="h-2 w-24 rounded-full" style={{ background: gradient }} />
      high
    </span>
  );
}
