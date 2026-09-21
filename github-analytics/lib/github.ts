/**
 * Data layer. Runs ONLY on the server (the /dashboard page and /api/dashboard-svg), so the
 * GITHUB_TOKEN is never sent to a browser and visitors never touch GitHub's API.
 *
 * With GITHUB_TOKEN set (recommended, deploy-time env var):
 *   - authenticated REST (5,000 req/h) and search (30 req/min)
 *   - the contribution calendar comes from GitHub's GraphQL API, including private contributions
 *     if your profile has "Include private contributions" enabled
 * Without it, everything falls back to anonymous access and a third-party calendar API.
 *
 * Swap these functions to plug in another data source; components only see `lib/types.ts`.
 */
import type { ContribData, ContribDay, Counts, GhRepo, GhUser, Res } from './types';

const API = 'https://api.github.com';
const FALLBACK_CALENDAR = 'https://github-contributions-api.jogruber.de/v4';
const TOKEN = process.env.GITHUB_TOKEN;

export const hasToken = Boolean(TOKEN);

export async function settle<T>(p: Promise<T>): Promise<Res<T>> {
  try {
    return { ok: true, v: await p };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ---------- http ----------

const authHeaders = (): Record<string, string> => (TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {});

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json', ...authHeaders() } });
  if (res.status === 401) throw new Error('GITHUB_TOKEN was rejected by GitHub (expired or revoked?).');
  if (res.status === 403 || res.status === 429) {
    throw new Error(
      TOKEN ? 'GitHub API rate limit reached.' : 'GitHub API rate limit reached. Set GITHUB_TOKEN to lift it.',
    );
  }
  if (!res.ok) throw new Error(`Request failed (${res.status}) for ${new URL(url).pathname}`);
  return res.json() as Promise<T>;
}

async function searchCount(kind: 'issues' | 'commits', q: string): Promise<number> {
  const data = await getJson<{ total_count: number }>(`${API}/search/${kind}?q=${encodeURIComponent(q)}&per_page=1`);
  return data.total_count;
}

// ---------- fetchers ----------

export function fetchUser(login: string): Promise<GhUser> {
  return getJson<GhUser>(`${API}/users/${login}`);
}

export async function fetchRepos(login: string): Promise<GhRepo[]> {
  const all: GhRepo[] = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await getJson<GhRepo[]>(`${API}/users/${login}/repos?per_page=100&sort=pushed&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
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

// ---------- contribution calendar ----------

const LEVELS: Record<string, ContribDay['level']> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const CALENDAR_QUERY = `query($login:String!,$from:DateTime!,$to:DateTime!){
  user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{
    totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}
}`;

interface CalendarResponse {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
}

/** One GraphQL call per calendar year (the API allows at most a 1-year window). Needs GITHUB_TOKEN. */
async function calendarFromGithub(login: string, sinceYear: number): Promise<ContribData> {
  const now = new Date();
  const years: number[] = [];
  for (let y = sinceYear; y <= now.getUTCFullYear(); y++) years.push(y);

  const results = await Promise.all(
    years.map(async (y) => {
      const to = y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ query: CALENDAR_QUERY, variables: { login, from: `${y}-01-01T00:00:00Z`, to } }),
      });
      if (!res.ok) throw new Error(`GraphQL request failed (${res.status})`);
      const json = (await res.json()) as CalendarResponse;
      const cal = json.data?.user?.contributionsCollection.contributionCalendar;
      if (!cal) throw new Error(json.errors?.[0]?.message ?? 'No calendar returned');
      return { year: y, cal };
    }),
  );

  const days: ContribDay[] = [];
  const totals: Record<string, number> = {};
  for (const { year, cal } of results) {
    totals[String(year)] = cal.totalContributions;
    for (const w of cal.weeks) {
      for (const d of w.contributionDays) {
        if (d.date.startsWith(String(year))) {
          days.push({ date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 });
        }
      }
    }
  }
  return { days, totals };
}

async function calendarFromFallback(login: string): Promise<ContribData> {
  const res = await fetch(`${FALLBACK_CALENDAR}/${login}?y=all`);
  if (!res.ok) throw new Error(`Contribution calendar unavailable (${res.status})`);
  const json = (await res.json()) as { total: Record<string, number>; contributions: ContribDay[] };
  return { days: json.contributions, totals: json.total };
}

export async function fetchContributions(login: string): Promise<ContribData> {
  let data: ContribData;
  if (TOKEN) {
    try {
      const user = await fetchUser(login);
      data = await calendarFromGithub(login, new Date(user.created_at).getUTCFullYear());
    } catch {
      data = await calendarFromFallback(login); // never let a GraphQL hiccup blank the page
    }
  } else {
    data = await calendarFromFallback(login);
  }
  // Calendars are padded with empty future days; drop them so streaks/averages are correct.
  const today = new Date().toISOString().slice(0, 10);
  const days = data.days.filter((d) => d.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  return { days, totals: data.totals };
}
