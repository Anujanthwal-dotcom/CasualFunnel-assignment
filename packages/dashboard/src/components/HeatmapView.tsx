import { useState } from 'react';
import { useHeatmap, usePages } from '../api/hooks';
import { formatNumber } from '../lib/format';
import { Card, EmptyState, ErrorState, Spinner } from './ui';
import { HeatmapCanvas } from './HeatmapCanvas';
import { PageSelect } from './PageSelect';

const DEFAULT_BOUNDS = { width: 1440, height: 900 };

export function HeatmapView() {
  const pages = usePages();
  const [pageUrl, setPageUrl] = useState<string | undefined>(undefined);

  const heatmap = useHeatmap(pageUrl);
  const selectedPage = pages.data?.find((page) => page.pageUrl === pageUrl);

  const points = heatmap.data?.points ?? [];
  const bounds = heatmap.data?.bounds ?? DEFAULT_BOUNDS;

  return (
    <section className="space-y-4">
      {/* Top Header & Page Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-ink">Click Heatmap</h2>
          <p className="mt-0.5 text-xs text-mute">
            Hover over any pointer to inspect event type and coordinates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-mute">Page:</span>
          <PageSelect
            pages={pages.data ?? []}
            selectedUrl={pageUrl}
            onSelect={setPageUrl}
            totalClicks={heatmap.data?.total}
            disabled={pages.isPending}
          />
        </div>
      </div>

      {/* Simplified Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric
          label="Total Clicks"
          value={formatNumber(heatmap.data?.total)}
          sub={selectedPage ? `${selectedPage.clickCount} on this page` : 'Across all sessions'}
        />
        <Metric
          label="Viewport Bounds"
          value={heatmap.data ? `${bounds.width} × ${bounds.height}` : '—'}
          sub="Width × Height"
        />
        <Metric
          label="Pages"
          value={formatNumber(pages.data?.length)}
          sub={pageUrl ? '1 selected page' : 'All tracked pages'}
        />
      </div>

      {/* Main Heatmap Card */}
      <Card className="overflow-hidden border border-hairline shadow-sm">
        {/* Card Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-doc px-4 py-2.5">
          <div className="flex items-center gap-2 font-mono text-xs text-mute">
            <span className="font-semibold text-ink truncate max-w-xs sm:max-w-md">
              {pageUrl || 'All pages'}
            </span>
            <span className="rounded bg-surface-soft px-1.5 py-0.5 text-[10px] text-mute">
              {bounds.width}×{bounds.height}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Intensity Scale Legend */}
            <div className="flex items-center gap-1.5 text-[11px] text-mute">
              <span>1 event</span>
              <span
                className="h-2 w-16 sm:w-20 rounded-full border border-hairline-soft"
                style={{
                  background:
                    'linear-gradient(90deg, #2c84e0 0%, #109ba5 25%, #2c8c66 50%, #f7a501 75%, #cd4239 100%)',
                }}
              />
              <span>High</span>
            </div>

            <span className="hidden sm:inline-block h-3 w-px bg-hairline" />

            {/* Click Count summary */}
            <div className="flex items-center gap-1.5 text-xs text-mute">
              <span className="inline-block h-2 w-2 rounded-full border border-[#23251d] bg-[#f7a501]" />
              <span className="font-semibold text-ink">{formatNumber(points.length)} clicks</span>
            </div>
          </div>
        </div>

        {/* Heatmap Canvas */}
        {heatmap.isPending && <Spinner label="Loading clicks…" />}
        {heatmap.isError && <ErrorState error={heatmap.error} />}
        {heatmap.data && points.length === 0 && (
          <EmptyState title="no data yet" />
        )}
        {heatmap.data && points.length > 0 && (
          <HeatmapCanvas
            points={points}
            bounds={bounds}
          />
        )}
      </Card>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-mute">{sub}</p>}
    </Card>
  );
}
