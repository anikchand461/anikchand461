import { Card, Tile } from '@/components/ui/Card';
import { fmt, totalStars } from '@/lib/analytics';
import type { AsyncState, ContribData, Counts, GhRepo, GhUser } from '@/lib/types';

interface Props {
  user: AsyncState<GhUser>;
  repos: AsyncState<GhRepo[]>;
  contrib: AsyncState<ContribData>;
  counts: AsyncState<Counts>;
}

/** Shows "…" while loading and "—" when that one source failed, so a single failure doesn't blank the card. */
function pick<T>(state: AsyncState<T>, get: (d: T) => number): string {
  if (state.status === 'loading') return '…';
  if (state.status === 'error') return '—';
  return fmt(get(state.data));
}

export function Overview({ user, repos, contrib, counts }: Props) {
  const since = contrib.status === 'ready' && contrib.data.days.length ? `Since ${contrib.data.days[0].date.slice(0, 4)}` : undefined;
  return (
    <Card title="Overview" meta="Public activity">
      <div className="grid g-4">
        <Tile gold label="Contributions (all time)" value={pick(contrib, (c) => c.days.reduce((s, d) => s + d.count, 0))} sub={since} />
        <Tile gold label="Commits (public)" value={pick(counts, (c) => c.commits)} sub="Default branches" />
        <Tile label="Stars earned" value={pick(repos, totalStars)} sub="Forks excluded" />
        <Tile label="Public repositories" value={pick(user, (u) => u.public_repos)} />
        <Tile label="Pull requests" value={pick(counts, (c) => c.prs)} />
        <Tile label="Issues opened" value={pick(counts, (c) => c.issues)} />
        <Tile label="Code reviews" value={pick(counts, (c) => c.reviews)} sub="On others' PRs" />
        <Tile label="Followers" value={pick(user, (u) => u.followers)} />
      </div>
      <p className="note">
        Following: <b>{pick(user, (u) => u.following)}</b>. Commit, PR, issue and review counts come from the public search
        API and only include public repositories.
      </p>
    </Card>
  );
}
