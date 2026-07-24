export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
}

// Every caller of this helper is reading live external state — oracle prices,
// on-chain holders, TVL, commit activity. Next.js caches `fetch` GETs on disk by
// default, which silently turned that into stale state: a cold server returned
// full factor coverage while making zero outbound requests, and each reading was
// still stamped with a fresh `as_of`. A cached Pyth response is the worst case,
// since publish-staleness is precisely what the oracle factor measures.
//
// So no-store is the default here. A caller that genuinely wants caching must
// opt in explicitly, which makes that decision visible at the call site.
export async function safeFetch(url: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 4000, ...rest } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { cache: 'no-store', ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface RetryFetchOptions extends SafeFetchOptions {
  retries?: number;
}

export async function safeFetchWithRetry(url: string, opts: RetryFetchOptions = {}): Promise<Response | null> {
  const { retries = 2, ...rest } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await safeFetch(url, rest);
      if (res.ok || res.status === 404) return res;
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
    }
  }

  return null;
}
