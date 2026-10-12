import type { TrackerConfig } from './config';

/** RFC4122 v4 id with a graceful fallback for older browsers. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface SessionState {
  id: string;
  lastSeen: number;
}

/**
 * Persists a single session id in localStorage (with a cookie fallback) so it
 * survives reloads. A new id is issued after `sessionTimeoutMs` of inactivity.
 */
export class SessionManager {
  private readonly idKey: string;
  private readonly tsKey: string;
  private state: SessionState;

  constructor(private readonly config: TrackerConfig) {
    this.idKey = `${config.namespace}_session_id`;
    this.tsKey = `${config.namespace}_session_ts`;
    this.state = this.load();
  }

  get id(): string {
    return this.state.id;
  }

  /** Refresh the idle timer; rotates the session id if it expired. */
  touch(): void {
    const now = Date.now();
    if (now - this.state.lastSeen > this.config.sessionTimeoutMs) {
      this.state = { id: uuid(), lastSeen: now };
    } else {
      this.state.lastSeen = now;
    }
    this.persist();
  }

  private load(): SessionState {
    const now = Date.now();
    const storedId = this.read(this.idKey);
    const storedTs = Number(this.read(this.tsKey));

    const valid = storedId && Number.isFinite(storedTs) && now - storedTs <= this.config.sessionTimeoutMs;
    const state: SessionState = valid
      ? { id: storedId as string, lastSeen: storedTs }
      : { id: uuid(), lastSeen: now };

    this.state = state;
    this.persist();
    return state;
  }

  private persist(): void {
    this.write(this.idKey, this.state.id);
    this.write(this.tsKey, String(this.state.lastSeen));
  }

  private read(key: string): string | null {
    try {
      const ls = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      if (ls) return ls;
    } catch {
      /* localStorage can throw in private mode — fall through to cookies */
    }
    return this.readCookie(key);
  }

  private write(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch {
      /* ignore and use cookie */
    }
    this.writeCookie(key, value);
  }

  private readCookie(key: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(?:^|; )' + key + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  private writeCookie(key: string, value: string): void {
    if (typeof document === 'undefined') return;
    const maxAge = Math.ceil(this.config.sessionTimeoutMs / 1000);
    document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`;
  }
}
