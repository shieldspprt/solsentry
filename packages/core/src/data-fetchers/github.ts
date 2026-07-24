import { safeFetchWithRetry } from '../../../../lib/safe-fetch';
import { WebCommunityStats } from '../../../../lib/types';

// Live developer activity from the GitHub REST API. Commit counts and distinct
// contributors over the last 30 days are a real, independently verifiable
// signal of whether a protocol is still actively maintained — unlike the
// "social sentiment" and "domain trust" scores this replaces, which had no
// source at all.
//
// Unauthenticated requests are limited to 60/hour per IP. Set GITHUB_TOKEN to
// raise that to 5,000/hour; results are cached in-process either way.

const GITHUB_ORGS: Record<string, string> = {
  kamino: 'Kamino-Finance',
  // Drift Labs' GitHub org now redirects to velocity-exchange; the old
  // 'drift-labs' path 404s on the orgs endpoint.
  drift: 'velocity-exchange',
  jupiter: 'jup-ag',
  orca: 'orca-so',
  raydium: 'raydium-io',
  meteora: 'MeteoraAg',
  marinade: 'marinade-finance',
  jito: 'jito-foundation',
  pumpfun: 'pump-fun',
};

// Number of an org's most recently pushed repos to sample. Protocol orgs carry
// long tails of archived SDK forks that would dilute the signal. Each repo
// costs one API call, so this also bounds the request budget: 1 + REPOS_SAMPLED
// calls per protocol.
const REPOS_SAMPLED = 3;

// Unauthenticated GitHub allows 60 requests/hour per IP. Scoring all nine
// protocols costs ~36 calls, so a short cache would exhaust the budget within
// two page loads and silently drop developer activity from every score.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
// When we do get rate-limited, stop hammering the API for a while.
const RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000;

const cache = new Map<string, { data: WebCommunityStats; at: number }>();
let rateLimitedUntil = 0;

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'solsentry-risk-engine',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function fetchDeveloperActivity(protocolSlug: string): Promise<WebCommunityStats | null> {
  const org = GITHUB_ORGS[protocolSlug];
  if (!org) return null;

  const cached = cache.get(org);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  // Serving a stale reading would be honest only if we said so; simpler to
  // report the factor as unmeasured until the budget resets.
  if (Date.now() < rateLimitedUntil) return null;

  try {
    const reposRes = await safeFetchWithRetry(
      `https://api.github.com/orgs/${org}/repos?sort=pushed&direction=desc&per_page=${REPOS_SAMPLED}`,
      { headers: headers(), timeoutMs: 6000 }
    );
    if (!reposRes) return null;
    if (reposRes.status === 403 || reposRes.status === 429) {
      rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
      return null;
    }
    if (!reposRes.ok) return null;

    const repos = await reposRes.json();
    if (!Array.isArray(repos) || repos.length === 0) return null;

    const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let sawRateLimit = false;
    const perRepo = await Promise.all(
      repos.map(async (repo: { name: string }) => {
        try {
          const res = await safeFetchWithRetry(
            `https://api.github.com/repos/${org}/${repo.name}/commits?since=${sinceIso}&per_page=100`,
            { headers: headers(), timeoutMs: 6000 }
          );
          if (!res) return null;
          if (res.status === 403 || res.status === 429) {
            sawRateLimit = true;
            return null;
          }
          if (!res.ok) return null;
          const commits = await res.json();
          if (!Array.isArray(commits)) return null;
          const authors = commits
            .map((c: any) => c?.author?.login || c?.commit?.author?.email)
            .filter((a: unknown): a is string => typeof a === 'string');
          return { commits: commits.length, authors };
        } catch {
          return null;
        }
      })
    );

    if (sawRateLimit) rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;

    const observed = perRepo.filter((r): r is { commits: number; authors: string[] } => r !== null);
    // A partial sample undercounts in a specific direction: if two of three
    // repos fail, the commit total is too low, which drags the score down. An
    // undercount is still a wrong number, so an incomplete sample counts as no
    // measurement rather than a pessimistic one.
    if (observed.length < repos.length) return null;

    const commits30d = observed.reduce((sum, r) => sum + r.commits, 0);
    const devs = new Set(observed.flatMap((r) => r.authors));

    const stats: WebCommunityStats = {
      developer_commits_30d: commits30d,
      active_devs_count: devs.size,
      github_org: org,
      repos_sampled: observed.length,
      as_of: new Date().toISOString(),
    };

    cache.set(org, { data: stats, at: Date.now() });
    return stats;
  } catch {
    return null;
  }
}
