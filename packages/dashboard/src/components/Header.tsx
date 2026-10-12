import { useStats } from '../api/hooks';
import { formatNumber } from '../lib/format';
import type { View } from '../App';

const TABS: Array<{ id: View; label: string }> = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'script', label: 'Script Tag' },
];

export function Header({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const { data: stats } = useStats();

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-hairline bg-ink text-sm font-bold text-primary">
            CF
          </div>
          <div>
            <h1 className="text-sm font-bold text-ink">CausalFunnel Analytics</h1>
            <p className="text-xs text-mute">Session tracking &amp; click heatmaps</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <nav className="inline-flex w-fit items-center gap-1 rounded-md border border-hairline bg-surface-soft p-1">
            {TABS.map((tab) => {
              const active = view === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange(tab.id)}
                  className={
                    'rounded-md px-3.5 py-1.5 text-xs font-bold transition-colors ' +
                    (active
                      ? 'border border-hairline bg-surface-card text-ink shadow-none'
                      : 'text-body hover:text-ink')
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <a
            href="/demo.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-soft px-3 py-2 text-xs font-bold text-body transition-colors hover:bg-surface-card hover:text-ink"
            title="Open tracking demo in a new tab"
          >
            Demo Page <span className="text-[10px] text-mute">↗</span>
          </a>
        </div>

        <dl className="flex items-center gap-5 text-xs">
          <Metric label="Events" value={formatNumber(stats?.totalEvents)} />
          <Metric label="Sessions" value={formatNumber(stats?.totalSessions)} />
          <Metric label="Clicks" value={formatNumber(stats?.clicks)} />
          <Metric label="Pages" value={formatNumber(stats?.totalPages)} />
        </dl>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-mute">{label}</dt>
      <dd className="text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}
