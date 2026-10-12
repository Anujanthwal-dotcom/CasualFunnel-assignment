import { useStats } from '../api/hooks';
import { formatNumber } from '../lib/format';
import type { View } from '../App';

const TABS: Array<{ id: View; label: string }> = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'heatmap', label: 'Heatmap' },
];

export function Header({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const { data: stats } = useStats();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-sm font-bold text-white">
            CF
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">CausalFunnel Analytics</h1>
            <p className="text-xs text-slate-400">Session tracking &amp; click heatmaps</p>
          </div>
        </div>

        <nav className="inline-flex w-fit items-center gap-1 rounded-lg bg-slate-900 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={
                'rounded-md px-3 py-1.5 text-sm font-medium transition ' +
                (view === tab.id
                  ? 'bg-slate-700 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200')
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>

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
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-200">{value}</dd>
    </div>
  );
}
