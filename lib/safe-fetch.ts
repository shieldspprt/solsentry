export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function safeFetch(url: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 4000, ...rest } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
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
