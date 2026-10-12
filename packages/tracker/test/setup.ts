/**
 * Test shim: provide an in-memory `localStorage`.
 *
 * happy-dom (and Node without `--localstorage-file`) does not expose a usable
 * storage object, so we install a minimal Storage implementation. This mirrors
 * a browser closely enough to exercise SessionManager's persistence logic.
 */
class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

let existing: unknown;
try {
  existing = globalThis.localStorage;
} catch {
  existing = undefined;
}

if (!existing) {
  const storage = new MemoryStorage();
  const targets: Array<object> = [globalThis];
  if (typeof window !== 'undefined') targets.push(window);
  for (const target of targets) {
    try {
      Object.defineProperty(target, 'localStorage', {
        value: storage,
        configurable: true,
        writable: true,
      });
    } catch {
      /* ignore — best effort */
    }
  }
}
