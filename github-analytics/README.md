# github-analytics

Frontend-only GitHub analytics dashboard (Next.js + React + TypeScript + Recharts). No backend, database or pipeline.
Data is fetched in the browser from public endpoints and cached in `localStorage` for 6 hours.

## Run / deploy

```bash
npm install
npm run dev        # http://localhost:3000/dashboard
```

Deploy to Vercel: import the repo, set **Root Directory** to `github-analytics`, keep the Next.js defaults.

Optional env vars (Vercel → Settings → Environment Variables):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_GITHUB_USERNAME` | `anikchand461` | Whose profile to show |
| `NEXT_PUBLIC_SHOW_GRADE` | `true` | `false` hides the custom activity grade |

## Data sources and limits

| Metric | Source | Limitation |
|---|---|---|
| Profile, repos, stars, followers | `api.github.com` REST | 60 requests/hour per visitor IP |
| Commit / PR / issue / review counts | GitHub search API | 10 requests/min; public repos only. Requests are throttled and paced |
| Contribution calendar (heatmap, streaks, momentum, rhythm) | `github-contributions-api.jogruber.de` (third-party, public) | Depends on that service being up |
| Commit cadence (hour × weekday) | GitHub public events feed | About the last 90 days / 300 events only; shown in viewer's local time |
| Language bytes | `/repos/:repo/languages` | One call per repo, capped at 12 repos (`LANGUAGE_REPO_LIMIT`); falls back to repo counts |

**Not available without authentication** (so not shown): private contributions, per-repository commit counts, lifetime commit
timestamps, code-review counts beyond search, "contributed to" repositories. A GitHub token can't be safely embedded in a
browser bundle. To get these later, replace the functions in `lib/github.ts` with calls to a source you control. The components
only depend on the types in `lib/types.ts`.

## Layout

```
app/              routes (/ redirects to /dashboard)
components/
  Dashboard.tsx   wires data to components
  analytics/      one component per section
  ui/             Card, Tile, Async (loading / error / empty)
lib/
  github.ts       all fetching, caching, throttling
  analytics.ts    pure calculations (streaks, rolling year, punch card, grade)
  types.ts        data interfaces
```

## Activity grade

A custom metric, not an official GitHub score. Eight dimensions, each min(value ÷ target, 1) × 100, weighted:
contribution volume 25%, consistency 20%, longest streak 10%, PRs 15%, issues 5%, reviews 5%, stars 10%, recent repo
activity 10%. Targets and letter cut-offs live in `lib/analytics.ts`.
