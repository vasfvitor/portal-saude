// Fetching the upstream JSON at build time, shared by every data source: one fetch per key per build,
// retries with backoff on transport errors, 429 and 5xx, bounded concurrency for the per-entity files.

const RETRIES = 5;
// GitHub Pages answers 429 when a build reads thousands of files in a row; waits double from 1 s (31 s in all)
// unless the server sends Retry-After, capped so one file cannot stall the build.
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60_000;

/** How long to wait before attempt `attempt + 1`: the server's Retry-After (seconds) when given, else 2^attempt s. */
export function backoff(attempt: number, retryAfter: string | null = null): number {
  const secs = retryAfter === null ? NaN : Number(retryAfter);
  const ms = Number.isFinite(secs) && secs >= 0 ? secs * 1000 : BASE_DELAY_MS * 2 ** attempt;
  return Math.min(ms, MAX_DELAY_MS);
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** GET JSON past the 600 s GitHub Pages cache; transport errors, 429 and 5xx are retried, other 4xx fail at once. */
export async function getJson(url: string): Promise<unknown> {
  const u = new URL(url);
  u.searchParams.set("t", String(Date.now()));
  let last: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    let retryAfter: string | null = null;
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (res.ok) return (await res.json()) as unknown;
      last = new Error(`HTTP ${res.status} at ${url}`);
      if (res.status < 500 && res.status !== 429) break;
      retryAfter = res.headers.get("retry-after");
    } catch (e) {
      last = e;
    }
    if (attempt < RETRIES) await sleep(backoff(attempt, retryAfter));
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
