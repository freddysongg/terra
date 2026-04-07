interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) return undefined;
    return entry.value;
  }

  getStale(key: string): T | undefined {
    return this.store.get(key)?.value;
  }

  isStale(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    return Date.now() > entry.expiresAt;
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
