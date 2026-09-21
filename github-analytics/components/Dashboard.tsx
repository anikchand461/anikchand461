'use client';

import { ActivityRhythm } from '@/components/analytics/ActivityRhythm';
import { CommitCadence } from '@/components/analytics/CommitCadence';
import { ContributionComposition } from '@/components/analytics/ContributionComposition';
import { Contributions } from '@/components/analytics/Contributions';
import { LanguageAnalysis } from '@/components/analytics/LanguageAnalysis';
import { LifetimeHeatmap } from '@/components/analytics/LifetimeHeatmap';
import { Momentum } from '@/components/analytics/Momentum';
import { Overview } from '@/components/analytics/Overview';
import { ProfileGrade } from '@/components/analytics/ProfileGrade';
import { RepositoryAnalysis } from '@/components/analytics/RepositoryAnalysis';
import { RepositoryPortfolio } from '@/components/analytics/RepositoryPortfolio';
import { SectionTag } from '@/components/ui/Card';
import { SHOW_GRADE, USERNAME } from '@/lib/config';
import {
  fetchComposition,
  fetchContributions,
  fetchCounts,
  fetchLanguageBytes,
  fetchPushSamples,
  fetchRepos,
  fetchUser,
} from '@/lib/github';
import { useAsync } from '@/lib/useAsync';

export function Dashboard() {
  const user = useAsync(() => fetchUser(USERNAME));
  const repos = useAsync(() => fetchRepos(USERNAME));
  const contrib = useAsync(() => fetchContributions(USERNAME));
  const events = useAsync(() => fetchPushSamples(USERNAME));
  const counts = useAsync(() => fetchCounts(USERNAME));

  // These depend on earlier results, so they wait until those are ready.
  const composition = useAsync(
    () => fetchComposition(USERNAME, contrib.status === 'ready' ? contrib.data.totals : {}),
    contrib.status,
    contrib.status === 'ready',
  );
  const bytes = useAsync(
    () => fetchLanguageBytes(USERNAME, repos.status === 'ready' ? repos.data : []),
    repos.status,
    repos.status === 'ready',
  );

  const composed = contrib.status === 'error' ? contrib : composition;

  return (
    <main className="wrap">
      <header className="head">
        {user.status === 'ready' && <img src={user.data.avatar_url} alt="" />}
        <div>
          <h1>GitHub Analytics · @{USERNAME}</h1>
          <p>Live from public GitHub data. Nothing is stored on a server.</p>
        </div>
      </header>

      <SectionTag id="overview">profile stat tiles</SectionTag>
      <Overview user={user} repos={repos} contrib={contrib} counts={counts} />

      <SectionTag id="momentum">the trailing twelve months, rolled across the whole history</SectionTag>
      <Momentum state={contrib} />

      <SectionTag id="contributions">streaks and averages</SectionTag>
      <Contributions state={contrib} />

      <SectionTag id="history">one grid per contribution year</SectionTag>
      <LifetimeHeatmap state={contrib} />

      <SectionTag id="composition">what the contributions are made of</SectionTag>
      <ContributionComposition state={composed} />

      <SectionTag id="rhythm">when the contributions happen</SectionTag>
      <ActivityRhythm state={contrib} />

      <SectionTag id="cadence">when the commits land, hour by hour</SectionTag>
      <CommitCadence state={events} />

      <SectionTag id="repositories">where the work lives</SectionTag>
      <RepositoryAnalysis state={repos} />

      <SectionTag id="portfolio">a lifeline per repository on one time axis</SectionTag>
      <RepositoryPortfolio state={repos} />

      <SectionTag id="languages">language treemap with a ranked list</SectionTag>
      <LanguageAnalysis repos={repos} bytes={bytes} />

      {SHOW_GRADE && (
        <>
          <SectionTag id="grade">a custom activity score</SectionTag>
          <ProfileGrade contrib={contrib} counts={counts} repos={repos} />
        </>
      )}
    </main>
  );
}
