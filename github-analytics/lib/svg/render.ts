import { fetchContributions, fetchCounts, fetchLanguageBytes, fetchRepos, settle } from '../github';
import { P } from '../palette';
import type { Counts, LanguageBytes, Res } from '../types';
import { Block, C, PAD, card, group, tag, text, wrapSvg } from './kit';
import * as S from './sections';

/** Fetches with the same data layer as the dashboard and lays it out as one tall SVG. */
export async function renderDashboardSvg(login: string): Promise<{ svg: string; degraded: boolean }> {
  const [repos, contrib] = await Promise.all([settle(fetchRepos(login)), settle(fetchContributions(login))]);
  const counts: Res<Counts> = contrib.ok && contrib.v.counts ? { ok: true, v: contrib.v.counts } : await settle(fetchCounts(login));
  const bytes: Res<LanguageBytes> = repos.ok ? await settle(fetchLanguageBytes(repos.v)) : { ok: false, error: repos.error };

  // [tag id, tag text, card title, card meta, content, accent]
  const sections: [string | null, string, string, string, Block, string][] = [
    [null, '', 'GitHub Stats', 'Live from GitHub', S.stats(repos, contrib, counts, bytes), P.gold],
    ['momentum', 'the trailing twelve months, rolled across the whole history', 'Momentum', 'Rolling 12 months · all contribution types', S.momentum(contrib), P.blue],
    ['history', 'one grid per contribution year', 'Contribution history', 'By day · one grid per year', S.heatmap(contrib), P.green],
    ['rhythm', 'when the contributions happen', 'Activity rhythm', 'All contribution types · all years', S.rhythm(contrib), P.orange],
    ['repositories', 'where the work lives', 'Top repositories', 'By stars · forks excluded', S.repositories(repos), P.purple],
    ['portfolio', 'a lifeline per repository on one time axis', 'Portfolio', 'Created → last push', S.portfolio(repos), P.pink],
  ];

  let y = PAD;
  let body = '';
  for (const [id, desc, title, metaText, content, accent] of sections) {
    if (id) {
      const t = tag(id, desc, accent);
      body += group(PAD, y, t.body);
      y += t.h;
    }
    const c = card(title, metaText, content, accent);
    body += group(PAD, y, c.body);
    y += c.h;
  }

  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  body += text(PAD, y + 26, `Generated ${stamp} UTC · click to open the interactive dashboard`, { size: 10, fill: C.muted });

  const degraded = [repos, contrib, counts, bytes].some((r) => !r.ok);
  return { svg: wrapSvg(y + 44, body, `GitHub analytics dashboard for ${login}`), degraded };
}
