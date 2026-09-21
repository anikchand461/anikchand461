import { ActivityRhythm } from '@/components/analytics/ActivityRhythm';
import { LifetimeHeatmap } from '@/components/analytics/LifetimeHeatmap';
import { Momentum } from '@/components/analytics/Momentum';
import { RepositoryAnalysis } from '@/components/analytics/RepositoryAnalysis';
import { RepositoryPortfolio } from '@/components/analytics/RepositoryPortfolio';
import { StatsOverview } from '@/components/analytics/StatsOverview';
import { SectionTag } from '@/components/ui/Card';
import { USERNAME } from '@/lib/config';
import { fetchContributions, fetchCounts, fetchLanguageBytes, fetchRepos, settle } from '@/lib/github';
import { P } from '@/lib/palette';
import type { AsyncState, Counts, LanguageBytes, Res } from '@/lib/types';

const toState = <T,>(r: Res<T>): AsyncState<T> => (r.ok ? { status: 'ready', data: r.v } : { status: 'error', error: r.error });

/**
 * Server component: data is fetched on the server (with GITHUB_TOKEN when set) and the page is
 * regenerated on a schedule, so visitors never call GitHub and the token never reaches the browser.
 */
export async function Dashboard() {
  const [repos, contrib] = await Promise.all([settle(fetchRepos(USERNAME)), settle(fetchContributions(USERNAME))]);
  // With a token the counts arrive with the calendar (GraphQL, includes private); otherwise use public search.
  const counts: Res<Counts> = contrib.ok && contrib.v.counts ? { ok: true, v: contrib.v.counts } : await settle(fetchCounts(USERNAME));
  const bytes: Res<LanguageBytes> = repos.ok ? await settle(fetchLanguageBytes(repos.v)) : { ok: false, error: repos.error };

  return (
    <main className="wrap">
      <StatsOverview repos={toState(repos)} contrib={toState(contrib)} counts={toState(counts)} bytes={toState(bytes)} />

      <SectionTag id="momentum" color={P.blue}>the trailing twelve months, rolled across the whole history</SectionTag>
      <Momentum state={toState(contrib)} />

      <SectionTag id="history" color={P.green}>one grid per contribution year</SectionTag>
      <LifetimeHeatmap state={toState(contrib)} />

      <SectionTag id="rhythm" color={P.orange}>when the contributions happen</SectionTag>
      <ActivityRhythm state={toState(contrib)} />

      <SectionTag id="repositories" color={P.purple}>where the work lives</SectionTag>
      <RepositoryAnalysis state={toState(repos)} />

      <SectionTag id="portfolio" color={P.pink}>a lifeline per repository on one time axis</SectionTag>
      <RepositoryPortfolio state={toState(repos)} />
    </main>
  );
}
