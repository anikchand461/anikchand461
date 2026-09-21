/** Pure functions: raw GitHub data in, chart-ready data out. No I/O. */
import type { ContribDay, GhRepo, LanguageBytes } from './types';

const DAY = 86_400_000;
const toUtc = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
const todayIso = () => new Date().toISOString().slice(0, 10);

export interface ContributionStats {
  total: number;
  activeDays: number;
  currentStreak: number;
  currentStreakRange: string | null;
  longestStreak: number;
  longestStreakRange: string | null;
  avgPerDay: number; // trailing 12 months
  frequency: number; // % of days active, trailing 12 months
  peakDay: ContribDay | null;
  trailingYear: number;
}

export function contributionStats(days: ContribDay[]): ContributionStats {
  const total = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  let longest = 0;
  let longestEnd = -1;
  let run = 0;
  days.forEach((d, i) => {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) {
      longest = run;
      longestEnd = i;
    }
  });

  // Current streak: today may still be empty, so allow it to end yesterday.
  let end = days.length - 1;
  if (end >= 0 && days[end].date === todayIso() && days[end].count === 0) end--;
  let current = 0;
  for (let i = end; i >= 0 && days[i].count > 0; i--) current++;

  const last365 = days.slice(-365);
  const trailingYear = last365.reduce((s, d) => s + d.count, 0);
  const peakDay = days.reduce<ContribDay | null>((p, d) => (!p || d.count > p.count ? d : p), null);

  return {
    total,
    activeDays,
    currentStreak: current,
    currentStreakRange: current ? `${days[end - current + 1].date} → ${days[end].date}` : null,
    longestStreak: longest,
    longestStreakRange: longest ? `${days[longestEnd - longest + 1].date} → ${days[longestEnd].date}` : null,
    avgPerDay: last365.length ? trailingYear / last365.length : 0,
    frequency: last365.length ? (last365.filter((d) => d.count > 0).length / last365.length) * 100 : 0,
    peakDay,
    trailingYear,
  };
}

/** Weekly points; each value is the sum of the previous 365 days (a rolling year). */
export function rollingYear(days: ContribDay[]): { date: string; value: number }[] {
  if (!days.length) return [];
  const prefix = [0];
  for (const d of days) prefix.push(prefix[prefix.length - 1] + d.count);
  const out: { date: string; value: number }[] = [];
  for (let i = 6; i < days.length; i += 7) {
    out.push({ date: days[i].date, value: prefix[i + 1] - prefix[Math.max(0, i + 1 - 365)] });
  }
  const last = days.length - 1;
  if ((last - 6) % 7 !== 0) {
    out.push({ date: days[last].date, value: prefix[last + 1] - prefix[Math.max(0, last + 1 - 365)] });
  }
  return out;
}

export function yearsOf(days: ContribDay[]): number[] {
  return [...new Set(days.map((d) => Number(d.date.slice(0, 4))))].sort((a, b) => a - b);
}

/** Group days into GitHub-style week columns (Sunday first) for one calendar year. */
export function yearGrid(days: ContribDay[], year: number): (ContribDay | null)[][] {
  const inYear = days.filter((d) => d.date.startsWith(String(year)));
  if (!inYear.length) return [];
  const weeks: (ContribDay | null)[][] = [];
  let week: (ContribDay | null)[] = new Array(new Date(`${inYear[0].date}T00:00:00Z`).getUTCDay()).fill(null);
  for (const d of inYear) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  return weeks;
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekdayTotals(days: ContribDay[]): number[] {
  const t = new Array(7).fill(0);
  for (const d of days) t[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += d.count;
  return t;
}

export function monthTotals(days: ContribDay[]): number[] {
  const t = new Array(12).fill(0);
  for (const d of days) t[Number(d.date.slice(5, 7)) - 1] += d.count;
  return t;
}

export function weekendShare(days: ContribDay[]): number {
  const t = weekdayTotals(days);
  const all = t.reduce((a, b) => a + b, 0);
  return all ? ((t[0] + t[6]) / all) * 100 : 0;
}

export type RepoSort = 'stars' | 'forks' | 'pushed' | 'size';

export function rankRepos(repos: GhRepo[], sort: RepoSort, includeForks = false): GhRepo[] {
  const key: Record<RepoSort, (r: GhRepo) => number> = {
    stars: (r) => r.stargazers_count,
    forks: (r) => r.forks_count,
    pushed: (r) => new Date(r.pushed_at).getTime(),
    size: (r) => r.size,
  };
  return repos
    .filter((r) => includeForks || !r.fork)
    .sort((a, b) => key[sort](b) - key[sort](a) || a.name.localeCompare(b.name));
}

export function totalStars(repos: GhRepo[], includeForks = false): number {
  return repos.filter((r) => includeForks || !r.fork).reduce((s, r) => s + r.stargazers_count, 0);
}

export interface LanguageShare {
  name: string;
  value: number;
  percent: number;
}

/** Bytes when available, otherwise number of repos using the language as primary. */
export function languageShares(bytes: LanguageBytes | null, repos: GhRepo[]): { unit: 'bytes' | 'repos'; rows: LanguageShare[] } {
  let source: Record<string, number>;
  let unit: 'bytes' | 'repos';
  if (bytes && Object.keys(bytes).length) {
    source = bytes;
    unit = 'bytes';
  } else {
    source = {};
    for (const r of repos) if (!r.fork && r.language) source[r.language] = (source[r.language] ?? 0) + 1;
    unit = 'repos';
  }
  const total = Object.values(source).reduce((a, b) => a + b, 0);
  const rows = Object.entries(source)
    .map(([name, value]) => ({ name, value, percent: total ? (value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
  return { unit, rows };
}

export const LANGUAGE_COLORS: Record<string, string> = {
  Python: '#3572A5',
  'Jupyter Notebook': '#DA5B0B',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'C++': '#f34b7d',
  C: '#8a8a8a',
  Java: '#b07219',
  Go: '#00ADD8',
  Shell: '#89e051',
};
export const languageColor = (name: string) => LANGUAGE_COLORS[name] ?? '#6e7681';

export const fmt = (n: number) => n.toLocaleString('en-US');
export const dayIndex = toUtc;
