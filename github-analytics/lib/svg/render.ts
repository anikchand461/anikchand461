import { fetchContributions, fetchCounts, fetchRepos, settle } from '../github';
import { Block, C, PAD, card, group, tag, text, wrapSvg } from './kit';
import * as S from './sections';

/** Fetches with the same data layer as the dashboard and lays it out as one tall SVG. */
export async function renderDashboardSvg(login: string): Promise<{ svg: string; degraded: boolean }> {
  const [repos, contrib, counts] = await Promise.all([
    settle(fetchRepos(login)),
    settle(fetchContributions(login)),
    settle(fetchCounts(login)),
  ]);

  const sections: [string, string, string, string, Block][] = [
    ['momentum', 'the trailing twelve months, rolled across the whole history', 'Momentum', 'Rolling 12 months · all contribution types', S.momentum(contrib)],
    ['contributions', 'streaks and averages', 'Contributions', 'Streaks over all years', S.contributions(contrib)],
    ['history', 'one grid per contribution year', 'Contribution history', 'By day', S.heatmap(contrib)],
    ['rhythm', 'when the contributions happen', 'Activity rhythm', 'All contribution types · all years', S.rhythm(contrib)],
    ['repositories', 'where the work lives', 'Top repositories', 'By stars · forks excluded', S.repositories(repos)],
    ['portfolio', 'a lifeline per repository on one time axis', 'Portfolio', 'Created → last push', S.portfolio(repos)],
    ['grade', 'a custom activity score', 'GitHub activity grade', 'Custom metric · not official', S.grade(contrib, counts, repos)],
  ];

  let y = PAD;
  let body = '';
  body += text(PAD, y + 22, `GitHub Analytics · @${login}`, { size: 20, weight: 700 });
  body += text(PAD, y + 42, 'Live from GitHub data · click to open the interactive dashboard', { size: 11, fill: C.muted });
  y += 58;

  for (const [id, desc, title, metaText, content] of sections) {
    const t = tag(id, desc);
    body += group(PAD, y, t.body);
    y += t.h;
    const c = card(title, metaText, content);
    body += group(PAD, y, c.body);
    y += c.h;
  }

  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  body += text(PAD, y + 26, `Generated ${stamp} UTC · anikchand461.vercel.app/dashboard`, { size: 10, fill: C.muted });

  const degraded = [repos, contrib, counts].some((r) => !r.ok);
  return { svg: wrapSvg(y + 44, body, `GitHub analytics dashboard for ${login}`), degraded };
}
