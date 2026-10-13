import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RealtimeEvent {
  id: string;
  session_id: string;
  event_type: string;
  page_url: string;
  timestamp: string;
  x?: number;
  y?: number;
  viewport?: { w: number; h: number };
  referrer?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  receivedAt: string;
}

export interface UseEventsWebSocketResult {
  isConnected: boolean;
  events: RealtimeEvent[];
  isPaused: boolean;
  togglePause: () => void;
  clearEvents: () => void;
}

const MAX_BUFFER = 100;

export function useEventsWebSocket(): UseEventsWebSocketResult {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  useEffect(() => {
    shouldReconnectRef.current = true;
    let retryDelay = 1000;

    function getWsUrl(): string {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl && typeof apiUrl === 'string') {
        try {
          const url = new URL(apiUrl);
          const wsProto = url.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${wsProto}//${url.host}/ws/events`;
        } catch {
          /* fallback */
        }
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws/events`;
    }

    function connect() {
      if (!shouldReconnectRef.current) return;

      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        retryDelay = 1000;
      };

      ws.onmessage = (messageEvent) => {
        try {
          const payload = JSON.parse(messageEvent.data);
          if (payload && payload.type === 'events' && Array.isArray(payload.data)) {
            const now = new Date().toLocaleTimeString();
            const incoming: RealtimeEvent[] = payload.data.map((item: any, idx: number) => ({
              ...item,
              id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
              receivedAt: now,
            }));

            if (!isPausedRef.current) {
              setEvents((prev) => {
                const combined = [...incoming.reverse(), ...prev];
                return combined.slice(0, MAX_BUFFER);
              });
            }

            // Invalidate queries so session lists, drawer timeline, heatmap, and counters update
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['timeline'] });
            queryClient.invalidateQueries({ queryKey: ['pages'] });
            queryClient.invalidateQueries({ queryKey: ['heatmap'] });
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 1.5, 10000);
            connect();
          }, retryDelay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [queryClient]);

  return {
    isConnected,
    events,
    isPaused,
    togglePause,
    clearEvents,
  };
}
