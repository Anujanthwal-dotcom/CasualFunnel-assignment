import type { TrackerConfig } from './config';

/** Wire format for a single tracked event. */
export interface TrackedEvent {
  session_id: string;
  event_type: string;
  page_url: string;
  /** ISO-8601 client timestamp. */
  timestamp: string;
  x?: number;
  y?: number;
  viewport?: { w: number; h: number };
  referrer?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

type DebugFn = (message: string, data?: unknown) => void;

/**
 * Batches events in memory and ships them to the API.
 *
 * - Uses `fetch(..., { keepalive: true })` for normal flushes so requests
 *   survive page navigations.
 * - Uses `navigator.sendBeacon` on unload, which the browser guarantees to
 *   deliver even as the page is being torn down.
 * - Re-queues failed batches (bounded by `maxQueue`) for at-least-once delivery.
 */
export class Transport {
  private queue: TrackedEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private readonly url: string;

  constructor(
    private readonly config: TrackerConfig,
    private readonly debug: DebugFn,
  ) {
    this.url = `${config.endpoint}/events`;
  }

  enqueue(event: TrackedEvent): void {
    this.queue.push(event);
    if (this.queue.length > this.config.maxQueue) {
      this.queue = this.queue.slice(-this.config.maxQueue);
    }

    if (this.queue.length >= this.config.batchSize) {
      void this.flush();
    } else {
      this.schedule();
    }
  }

  private schedule(): void {
    if (this.timer != null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  /** Flush on page unload via sendBeacon (fire-and-forget). */
  flushBeacon(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    const payload = JSON.stringify({ events: batch });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const ok = navigator.sendBeacon(this.url, blob);
      this.debug('beacon flush', { count: batch.length, ok });
      if (!ok) this.requeue(batch);
      return;
    }
    // Fallback: keepalive fetch.
    void this.send(batch);
  }

  /** Flush all queued events via fetch. */
  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      await this.send(batch);
    } finally {
      this.flushing = false;
      if (this.queue.length > 0) this.schedule();
    }
  }

  private async send(batch: TrackedEvent[]): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers['x-api-key'] = this.config.apiKey;

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: batch }),
        keepalive: true,
        mode: 'cors',
        credentials: 'omit',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.debug('flushed', { count: batch.length });
    } catch (err) {
      this.debug('flush failed, re-queueing', { count: batch.length, err });
      this.requeue(batch);
    }
  }

  private requeue(batch: TrackedEvent[]): void {
    const room = this.config.maxQueue - this.queue.length;
    const kept = batch.slice(-Math.max(0, room));
    if (kept.length > 0) this.queue = kept.concat(this.queue);
  }
}
