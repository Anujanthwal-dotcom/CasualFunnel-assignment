import { useState } from 'react';
import { Header } from './components/Header';
import { SessionsView } from './components/SessionsView';
import { HeatmapView } from './components/HeatmapView';
import { ScriptTagView } from './components/ScriptTagView';

export type View = 'sessions' | 'heatmap' | 'script';

export default function App() {
  const [view, setView] = useState<View>('sessions');

  return (
    <div className="min-h-full bg-canvas text-body">
      <Header view={view} onChange={setView} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {view === 'sessions' && <SessionsView />}
        {view === 'heatmap' && <HeatmapView />}
        {view === 'script' && <ScriptTagView />}
      </main>
    </div>
  );
}
