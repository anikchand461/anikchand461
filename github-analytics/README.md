# github-analytics

GitHub analytics dashboard (Next.js + React + TypeScript + Recharts). No database, no separate backend, no CI pipeline.

Data is fetched **on the server** (with your `GITHUB_TOKEN`), and the page is regenerated at most every 6 hours. Visitors
never call GitHub, so there are no per-visitor rate limits, and the token never reaches the browser.

## Run / deploy

```bash
npm install
GITHUB_TOKEN=ghp_xxx npm run dev      # http://localhost:3000/dashboard
```

Deploy to Vercel: import the repo, set **Root Directory** to `github-analytics`, keep the Next.js defaults, then add the
environment variables below and redeploy.

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Recommended | Server-only. Lifts rate limits and switches the contribution calendar to GitHub's own GraphQL API |
| `NEXT_PUBLIC_GITHUB_USERNAME` | No (default `anikchand461`) | Whose profile to show |
| `NEXT_PUBLIC_SHOW_GRADE` | No (default `true`) | `false` hides the custom activity grade |

**Never** name the token `NEXT_PUBLIC_*`: that prefix is bundled into browser code.

### Creating the token

GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate.
Select **`read:user`** only (needed to include private contribution counts). Set "no expiration" or a long one; if it expires the
site keeps working on the anonymous fallback but with fewer/less accurate numbers. To include private contributions, also enable
*Profile → Contributions → "Include private contributions on my profile"*.

## What's shown

Momentum, Contributions, Contribution history (heatmap), Activity rhythm, Top repositories, Portfolio timeline, and the custom
Activity grade.

## Data sources

| Metric | With `GITHUB_TOKEN` | Without |
|---|---|---|
| Contribution calendar (heatmap, streaks, momentum, rhythm) | GitHub GraphQL, includes private contributions | Third-party `github-contributions-api.jogruber.de` (public only) |
| Profile, repos, stars | GitHub REST, 5,000 req/h | 60 req/h shared by the host's IP |
| PR / issue / review / commit counts | GitHub search, 30 req/min | 10 req/min |

If GraphQL ever fails, the calendar falls back to the third-party API rather than showing an error.
Not available at all: per-repository commit counts and code-review counts beyond search.

## README image (`/api/dashboard-svg`)

GitHub READMEs can't run React, so `GET /api/dashboard-svg` uses the same data layer and calculations as `/dashboard` and
returns one tall SVG, which the profile README embeds inside a link to `/dashboard`. Cached at the edge for 6 hours (5 minutes
if a data source failed). GitHub caches README images too; bump the `?v=` number in the README to force a refresh.

## Layout

```
app/              routes (/ redirects to /dashboard, /api/dashboard-svg)
components/
  Dashboard.tsx   server component: fetches data and wires it to the sections
  analytics/      one component per section
  ui/             Card, Tile, Async (loading / error / empty)
lib/
  github.ts       all fetching (server only)
  analytics.ts    pure calculations (streaks, rolling year, grade)
  svg/            SVG renderer for the README image
  types.ts        data interfaces
```

## Activity grade

A custom metric, not an official GitHub score. Eight dimensions, each min(value ÷ target, 1) × 100, weighted:
contribution volume 25%, consistency 20%, longest streak 10%, PRs 15%, issues 5%, reviews 5%, stars 10%, recent repo
activity 10%. Targets and letter cut-offs live in `lib/analytics.ts`.
