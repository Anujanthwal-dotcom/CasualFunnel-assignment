import { useState } from 'react';
import { useEventsWebSocket } from './api/websocket';
import { Header } from './components/Header';
import { HeatmapView } from './components/HeatmapView';
import { ScriptTagView } from './components/ScriptTagView';
import { SessionsView } from './components/SessionsView';

export type View = 'sessions' | 'heatmap' | 'script';

export default function App() {
  const [view, setView] = useState<View>('sessions');

  // Maintain real-time WebSocket connection to automatically refresh telemetry across views
  useEventsWebSocket();

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
