/**
 * Data layer. Everything here runs in the browser against public endpoints:
 *   - api.github.com REST (unauthenticated, 60 req/h, search 10 req/min)
 *   - github-contributions-api.jogruber.de (public, CORS-enabled contribution calendar)
 * Swap these functions to plug in another data source; components only see `lib/types.ts`.
 */
import { LANGUAGE_REPO_LIMIT } from './config';
import type {
  ContribData,
  Counts,
  GhRepo,
  GhUser,
  LanguageBytes,
  PushSample,
  YearComposition,
} from './types';

const API = 'https://api.github.com';
const CONTRIB_API = 'https://github-contributions-api.jogruber.de/v4';
const CACHE_TTL = 6 * 60 * 60 * 1000;

// ---------- cache (localStorage, so repeat visits don't burn the rate limit) ----------

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`ga:${key}`);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw) as { t: number; v: T };
    return Date.now() - t < CACHE_TTL ? v : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, v: unknown) {
  try {
    localStorage.setItem(`ga:${key}`, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* storage unavailable — fine */
  }
}

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = readCache<T>(key);
  if (hit !== null) return hit;
  const value = await load();
  writeCache(key, value);
  return value;
}

// ---------- http ----------

export class RateLimitError extends Error {}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (res.status === 403 || res.status === 429) {
    throw new RateLimitError('GitHub API rate limit reached. Try again in a few minutes.');
  }
  if (!res.ok) throw new Error(`Request failed (${res.status}) for ${new URL(url).pathname}`);
  return res.json() as Promise<T>;
}

// Search API allows 10 requests/min unauthenticated; stay under with a sliding window.
const searchTimes: number[] = [];
async function throttleSearch() {
  for (;;) {
    const now = Date.now();
    while (searchTimes.length && now - searchTimes[0] > 60_000) searchTimes.shift();
    if (searchTimes.length < 9) {
      searchTimes.push(now);
      return;
    }
    await new Promise((r) => setTimeout(r, 60_000 - (now - searchTimes[0]) + 100));
  }
}

function searchCount(kind: 'issues' | 'commits', q: string): Promise<number> {
  return cached(`search:${kind}:${q}`, async () => {
    await throttleSearch();
    const data = await getJson<{ total_count: number }>(
      `${API}/search/${kind}?q=${encodeURIComponent(q)}&per_page=1`,
    );
    return data.total_count;
  });
}

// ---------- fetchers ----------

export function fetchUser(login: string): Promise<GhUser> {
  return cached(`user:${login}`, () => getJson<GhUser>(`${API}/users/${login}`));
}

export function fetchRepos(login: string): Promise<GhRepo[]> {
  return cached(`repos:${login}`, async () => {
    const all: GhRepo[] = [];
    for (let page = 1; page <= 5; page++) {
      const batch = await getJson<GhRepo[]>(
        `${API}/users/${login}/repos?per_page=100&sort=pushed&page=${page}`,
      );
      all.push(...batch);
      if (batch.length < 100) break;
    }
    return all;
  });
}

export function fetchContributions(login: string): Promise<ContribData> {
  return cached(`contrib:${login}`, async () => {
    const res = await fetch(`${CONTRIB_API}/${login}?y=all`);
    if (!res.ok) throw new Error(`Contribution calendar unavailable (${res.status})`);
    const json = (await res.json()) as { total: Record<string, number>; contributions: ContribData['days'] };
    // The API pads the current year with empty future days; drop them so streaks/averages are correct.
    const today = new Date().toISOString().slice(0, 10);
    const days = json.contributions.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
    return { days, totals: json.total };
  });
}

/** Public push events, last 90 days at most (GitHub keeps 300 events / 90 days). */
export function fetchPushSamples(login: string): Promise<PushSample[]> {
  return cached(`events:${login}`, async () => {
    const samples: PushSample[] = [];
    for (let page = 1; page <= 3; page++) {
      const events = await getJson<
        { type: string; created_at: string; payload: { size?: number; commits?: unknown[] } }[]
      >(`${API}/users/${login}/events/public?per_page=100&page=${page}`);
      for (const e of events) {
        if (e.type !== 'PushEvent') continue;
        samples.push({
          createdAt: e.created_at,
          commits: Math.max(1, e.payload.size ?? e.payload.commits?.length ?? 1),
        });
      }
      if (events.length < 100) break;
    }
    return samples;
  });
}

export async function fetchCounts(login: string): Promise<Counts> {
  const [commits, prs, issues, reviews] = await Promise.all([
    searchCount('commits', `author:${login}`),
    searchCount('issues', `author:${login} type:pr`),
    searchCount('issues', `author:${login} type:issue`),
    searchCount('issues', `reviewed-by:${login} type:pr -author:${login}`),
  ]);
  return { commits, prs, issues, reviews };
}

/** Per-year PR / issue / review counts, paced to respect the search rate limit. */
export async function fetchComposition(
  login: string,
  totals: Record<string, number>,
): Promise<YearComposition[]> {
  const years = Object.keys(totals).map(Number).sort((a, b) => a - b);
  const out: YearComposition[] = [];
  for (const year of years) {
    const range = `created:${year}-01-01..${year}-12-31`;
    const [prs, issues, reviews] = await Promise.all([
      searchCount('issues', `author:${login} type:pr ${range}`),
      searchCount('issues', `author:${login} type:issue ${range}`),
      searchCount('issues', `reviewed-by:${login} type:pr -author:${login} ${range}`),
    ]);
    const total = totals[String(year)] ?? 0;
    out.push({ year, total, prs, issues, reviews, other: Math.max(0, total - prs - issues - reviews) });
  }
  return out;
}

/** Bytes per language across the largest original repos (one API call each). */
export function fetchLanguageBytes(login: string, repos: GhRepo[]): Promise<LanguageBytes> {
  return cached(`langs:${login}`, async () => {
    const targets = repos
      .filter((r) => !r.fork)
      .sort((a, b) => b.size - a.size)
      .slice(0, LANGUAGE_REPO_LIMIT);
    const results = await Promise.allSettled(
      targets.map((r) => getJson<LanguageBytes>(`${API}/repos/${r.full_name}/languages`)),
    );
    const total: LanguageBytes = {};
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const [lang, bytes] of Object.entries(r.value)) total[lang] = (total[lang] ?? 0) + bytes;
    }
    if (!Object.keys(total).length) throw new Error('Language data unavailable (rate limit?)');
    return total;
  });
}
