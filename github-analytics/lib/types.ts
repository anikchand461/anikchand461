export interface GhUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
}

export interface GhRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
  size: number;
  license: { spdx_id: string | null } | null;
}

export interface ContribDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContribData {
  days: ContribDay[]; // sorted ascending
  totals: Record<string, number>; // per calendar year
}

export interface Counts {
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
}

/** Result of one data fetch; a single failing source must not blank the whole page. */
export type Res<T> = { ok: true; v: T } | { ok: false; error: string };

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };
