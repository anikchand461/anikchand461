import { ActivityRhythm } from '@/components/analytics/ActivityRhythm';
import { Contributions } from '@/components/analytics/Contributions';
import { LifetimeHeatmap } from '@/components/analytics/LifetimeHeatmap';
import { Momentum } from '@/components/analytics/Momentum';
import { ProfileGrade } from '@/components/analytics/ProfileGrade';
import { RepositoryAnalysis } from '@/components/analytics/RepositoryAnalysis';
import { RepositoryPortfolio } from '@/components/analytics/RepositoryPortfolio';
import { SectionTag } from '@/components/ui/Card';
import { SHOW_GRADE, USERNAME } from '@/lib/config';
import { fetchContributions, fetchCounts, fetchRepos, fetchUser, settle } from '@/lib/github';
import type { AsyncState, Res } from '@/lib/types';

const toState = <T,>(r: Res<T>): AsyncState<T> => (r.ok ? { status: 'ready', data: r.v } : { status: 'error', error: r.error });

/**
 * Server component: data is fetched on the server (with GITHUB_TOKEN when set) and the page is
 * regenerated on a schedule, so visitors never call GitHub and the token never reaches the browser.
 */
export async function Dashboard() {
  const [user, repos, contrib, counts] = await Promise.all([
    settle(fetchUser(USERNAME)),
    settle(fetchRepos(USERNAME)),
    settle(fetchContributions(USERNAME)),
    settle(fetchCounts(USERNAME)),
  ]);

  return (
    <main className="wrap">
      <header className="head">
        {user.ok && <img src={user.v.avatar_url} alt="" />}
        <div>
          <h1>GitHub Analytics · @{USERNAME}</h1>
          <p>Refreshed automatically from GitHub every few hours.</p>
        </div>
      </header>

      <SectionTag id="momentum">the trailing twelve months, rolled across the whole history</SectionTag>
      <Momentum state={toState(contrib)} />

      <SectionTag id="contributions">streaks and averages</SectionTag>
      <Contributions state={toState(contrib)} />

      <SectionTag id="history">one grid per contribution year</SectionTag>
      <LifetimeHeatmap state={toState(contrib)} />

      <SectionTag id="rhythm">when the contributions happen</SectionTag>
      <ActivityRhythm state={toState(contrib)} />

      <SectionTag id="repositories">where the work lives</SectionTag>
      <RepositoryAnalysis state={toState(repos)} />

      <SectionTag id="portfolio">a lifeline per repository on one time axis</SectionTag>
      <RepositoryPortfolio state={toState(repos)} />

      {SHOW_GRADE && (
        <>
          <SectionTag id="grade">a custom activity score</SectionTag>
          <ProfileGrade contrib={toState(contrib)} counts={toState(counts)} repos={toState(repos)} />
        </>
      )}
    </main>
  );
}
