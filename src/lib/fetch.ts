// Fetching the upstream JSON at build time, shared by every data source: one fetch per key per build,
// retries on transport errors and 5xx, bounded concurrency for the per-entity files.

const RETRIES = 2;

/** GET JSON past the 600 s GitHub Pages cache; transport errors and 5xx are retried, 4xx fail at once. */
export async function getJson(url: string): Promise<unknown> {
  const u = new URL(url);
  u.searchParams.set("t", String(Date.now()));
  let last: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (res.ok) return (await res.json()) as unknown;
      last = new Error(`HTTP ${res.status} at ${url}`);
      if (res.status < 500) break;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(`fetch failed at ${url}`);
}

/** Run `fn` over `items` with at most `limit` in flight; results keep the input order. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// one load per key per build, shared by every page and endpoint
const cache = new Map<string, Promise<unknown>>();
export function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load();
    cache.set(key, p);
  }
  return p;
}
