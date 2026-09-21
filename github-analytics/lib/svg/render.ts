import {
  fetchComposition,
  fetchContributions,
  fetchCounts,
  fetchLanguageBytes,
  fetchPushSamples,
  fetchRepos,
  fetchUser,
} from '../github';
import { Block, C, CARD_W, PAD, card, group, text, wrapSvg, tag } from './kit';
import * as S from './sections';
import type { Res } from './sections';

async function settle<T>(p: Promise<T>): Promise<Res<T>> {
  try {
    return { ok: true, v: await p };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/** Fetches everything with the same data layer as the dashboard and lays it out as one tall SVG. */
export async function renderDashboardSvg(login: string): Promise<{ svg: string; degraded: boolean }> {
  const [user, repos, contrib, events, counts] = await Promise.all([
    settle(fetchUser(login)),
    settle(fetchRepos(login)),
    settle(fetchContributions(login)),
    settle(fetchPushSamples(login)),
    settle(fetchCounts(login)),
  ]);
  // These depend on earlier results, so they run second (same order as the interactive dashboard).
  const [comp, bytes] = await Promise.all([
    contrib.ok ? settle(fetchComposition(login, contrib.v.totals)) : Promise.resolve<Res<never>>({ ok: false, error: contrib.error }),
    repos.ok ? settle(fetchLanguageBytes(login, repos.v)) : Promise.resolve<Res<never>>({ ok: false, error: repos.error }),
  ]);

  const sections: [string, string, string, string, Block][] = [
    ['overview', 'profile stat tiles', 'Overview', 'Public activity', S.overview(user, repos, contrib, counts)],
    ['momentum', 'the trailing twelve months, rolled across the whole history', 'Momentum', 'Rolling 12 months · all contribution types', S.momentum(contrib)],
    ['contributions', 'streaks and averages', 'Contributions', 'Streaks over all years · public', S.contributions(contrib)],
    ['history', 'one grid per contribution year', 'Contribution history', 'By day · public', S.heatmap(contrib)],
    ['composition', 'what the contributions are made of', 'Contribution composition', 'By type · per year', S.composition(comp)],
    ['rhythm', 'when the contributions happen', 'Activity rhythm', 'All contribution types · all years', S.rhythm(contrib)],
    ['cadence', 'when the commits land, hour by hour', 'Commit cadence', 'Recent public pushes', S.cadence(events)],
    ['repositories', 'where the work lives', 'Top repositories', 'By stars · forks excluded', S.repositories(repos)],
    ['portfolio', 'a lifeline per repository on one time axis', 'Portfolio', 'Created → last push', S.portfolio(repos)],
    ['languages', 'language treemap with a ranked list', 'Languages', 'Public source repositories', S.languages(repos, bytes)],
    ['grade', 'a custom activity score', 'GitHub activity grade', 'Custom metric · not official', S.grade(contrib, counts, repos)],
  ];

  let y = PAD;
  let body = '';
  // header
  body += text(PAD, y + 22, `GitHub Analytics · @${login}`, { size: 20, weight: 700 });
  body += text(PAD, y + 42, 'Live from public GitHub data · click to open the interactive dashboard', { size: 11, fill: C.muted });
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
  const height = y + 44;

  const degraded = [user, repos, contrib, events, counts, comp, bytes].some((r) => !r.ok);
  return { svg: wrapSvg(height, body, `GitHub analytics dashboard for ${login}`), degraded };
}

export { CARD_W };
