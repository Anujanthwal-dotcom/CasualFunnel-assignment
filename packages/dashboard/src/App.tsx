import { useState } from 'react';
import { Header } from './components/Header';
import { SessionsView } from './components/SessionsView';
import { HeatmapView } from './components/HeatmapView';

export type View = 'sessions' | 'heatmap';

export default function App() {
  const [view, setView] = useState<View>('sessions');

  return (
    <div className="min-h-full bg-slate-950">
      <Header view={view} onChange={setView} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {view === 'sessions' ? <SessionsView /> : <HeatmapView />}
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
        CausalFunnel · event tracking demo · timestamps shown in your local timezone
      </footer>
    </div>
  );
}
