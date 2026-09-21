'use client';

import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { GRADE_SCALE, activityGrade, contributionStats, recentOriginalRepos, totalStars } from '@/lib/analytics';
import type { AsyncState, ContribData, Counts, GhRepo } from '@/lib/types';

interface Props {
  contrib: AsyncState<ContribData>;
  counts: AsyncState<Counts>;
  repos: AsyncState<GhRepo[]>;
}

export function ProfileGrade({ contrib, counts, repos }: Props) {
  const state: AsyncState<{ c: ContribData; n: Counts; r: GhRepo[] }> =
    contrib.status === 'ready' && counts.status === 'ready' && repos.status === 'ready'
      ? { status: 'ready', data: { c: contrib.data, n: counts.data, r: repos.data } }
      : [contrib, counts, repos].find((s) => s.status === 'error')
        ? { status: 'error', error: 'Grade needs contributions, counts and repositories. One of them failed to load.' }
        : { status: 'loading' };

  return (
    <Card title="GitHub activity grade" meta="Custom metric · not an official GitHub score">
      <Async state={state}>
        {({ c, n, r }) => {
          const s = contributionStats(c.days);
          const g = activityGrade({
            trailingYear: s.trailingYear,
            activeDayPct: s.frequency,
            longestStreak: s.longestStreak,
            prs: n.prs,
            issues: n.issues,
            reviews: n.reviews,
            stars: totalStars(r),
            recentRepos: recentOriginalRepos(r),
          });
          return (
            <>
              <div className="grade">
                <div>
                  <div className="letter" aria-label={`Grade ${g.grade}`}>{g.grade}</div>
                  <div className="score">{g.score.toFixed(0)} / 100</div>
                </div>
                <table>
                  <tbody>
                    {g.parts.map((p) => (
                      <tr key={p.label}>
                        <td style={{ width: 150 }}>{p.label} <span className="meta">×{Math.round(p.weight * 100)}%</span></td>
                        <td style={{ width: '35%' }}>
                          <div className="bar"><i style={{ width: `${p.score}%` }} /></div>
                        </td>
                        <td className="meta" style={{ textTransform: 'none' }}>{p.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note">
                <b>Formula:</b> weighted average of eight dimensions, each scored 0–100 as min(value ÷ target, 1). Letter cut-offs:{' '}
                {GRADE_SCALE.map(([min, l]) => `${l} ≥ ${min}`).join(' · ')} · F below 40. It measures GitHub activity only, not skill.
                Tune the targets in <code>lib/analytics.ts</code>.
              </p>
            </>
          );
        }}
      </Async>
    </Card>
  );
}
