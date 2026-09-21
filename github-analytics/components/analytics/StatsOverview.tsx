import { Card } from '@/components/ui/Card';
import { contributionStats, fmt, languageColor, languageShares, totalStars } from '@/lib/analytics';
import { P, STAT_COLORS } from '@/lib/palette';
import type { AsyncState, ContribData, Counts, GhRepo, LanguageBytes } from '@/lib/types';

interface Props {
  repos: AsyncState<GhRepo[]>;
  contrib: AsyncState<ContribData>;
  counts: AsyncState<Counts>;
  bytes: AsyncState<LanguageBytes>;
}

/** "…" while loading, "—" when just that source failed, so one failure doesn't blank the card. */
function pick<T>(state: AsyncState<T>, get: (d: T) => number | undefined): string {
  if (state.status === 'loading') return '…';
  if (state.status === 'error') return '—';
  const v = get(state.data);
  return v === undefined ? '—' : fmt(v);
}

function Ring({ pct, color, children }: { pct: number; color: string; children: React.ReactNode }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg viewBox="0 0 124 124" aria-hidden>
        <circle cx="62" cy="62" r={r} fill="none" stroke="#21262d" strokeWidth="9" />
        <circle
          cx="62" cy="62" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`} transform="rotate(-90 62 62)"
        />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

export function StatsOverview({ repos, contrib, counts, bytes }: Props) {
  return (
    <Card title="GitHub Stats" meta="Live from GitHub" accent={P.gold}>
      {contrib.status === 'ready' ? (
        <Body contrib={contrib.data} repos={repos} counts={counts} bytes={bytes} />
      ) : (
        <div className={contrib.status === 'error' ? 'state err' : 'skeleton'} role="status">
          {contrib.status === 'error' ? contrib.error : ''}
        </div>
      )}
    </Card>
  );
}

function Body({ contrib, repos, counts, bytes }: { contrib: ContribData } & Omit<Props, 'contrib'>) {
  const s = contributionStats(contrib.days);
  const since = contrib.days[0]?.date;
  const langs =
    repos.status === 'ready'
      ? languageShares(bytes.status === 'ready' ? bytes.data : null, repos.data)
      : { unit: 'repos' as const, rows: [] };
  const top = langs.rows.slice(0, 8);

  const rows: [string, string, string][] = [
    ['Total Stars Earned', pick(repos, (r) => totalStars(r, true)), STAT_COLORS.stars],
    ['Total Commits', pick(counts, (c) => c.commits), STAT_COLORS.commits],
    ['Total PRs', pick(counts, (c) => c.prs), STAT_COLORS.prs],
    ['Total Issues', pick(counts, (c) => c.issues), STAT_COLORS.issues],
    ['Contributed to (other repos)', contrib.contributedTo === undefined ? '—' : fmt(contrib.contributedTo), STAT_COLORS.contributed],
  ];

  return (
    <>
      <div className="stats-top">
        <div>
          <h3 className="stats-h" style={{ color: P.gold }}>Overview</h3>
          {rows.map(([label, value, color]) => (
            <div className="stat-row" key={label}>
              <span className="stat-dot" style={{ background: color }} />
              <span>{label}</span>
              <b style={{ color }}>{value}</b>
            </div>
          ))}
        </div>

        <div className="stats-mid">
          <Ring pct={s.frequency} color={P.green}>
            <b style={{ color: P.green }}>{s.frequency.toFixed(0)}%</b>
            <small>active days</small>
          </Ring>
        </div>

        <div>
          <h3 className="stats-h" style={{ color: P.cyan }}>Most Used Languages</h3>
          {top.length > 0 && (
            <>
              <div className="lang-bar" role="img" aria-label="Language breakdown">
                {top.map((l) => (
                  <i key={l.name} style={{ width: `${l.percent}%`, background: languageColor(l.name) }} title={`${l.name} ${l.percent.toFixed(1)}%`} />
                ))}
              </div>
              <div className="lang-legend">
                {top.map((l) => (
                  <span key={l.name}>
                    <i style={{ background: languageColor(l.name) }} />
                    {l.name} {l.percent.toFixed(1)}%
                  </span>
                ))}
              </div>
            </>
          )}
          {top.length === 0 && <div className="state">No language data.</div>}
        </div>
      </div>

      <div className="stats-bottom">
        <div className="big">
          <b style={{ color: P.blue }}>{fmt(s.total)}</b>
          <span>Total Contributions</span>
          <small>{since ? `${since} → present` : ''}</small>
        </div>
        <div className="big">
          <Ring pct={Math.min(100, (s.currentStreak / Math.max(s.longestStreak, 1)) * 100)} color={P.orange}>
            <b style={{ color: P.orange }}>{s.currentStreak}</b>
            <small>days</small>
          </Ring>
          <span style={{ color: P.orange, fontWeight: 700 }}>Current Streak</span>
          <small>{s.currentStreakRange ?? 'No active streak'}</small>
        </div>
        <div className="big">
          <b style={{ color: P.pink }}>{s.longestStreak}</b>
          <span>Longest Streak</span>
          <small>{s.longestStreakRange ?? ''}</small>
        </div>
      </div>

      <div className="grid g-4" style={{ marginTop: 14 }}>
        <div className="tile"><div className="label">Average per day</div><div className="value" style={{ color: P.cyan }}>{s.avgPerDay.toFixed(1)}</div><div className="sub">Trailing 12 months</div></div>
        <div className="tile"><div className="label">Contribution frequency</div><div className="value" style={{ color: P.green }}>{s.frequency.toFixed(0)}%</div><div className="sub">Days with activity</div></div>
        <div className="tile"><div className="label">Last 12 months</div><div className="value" style={{ color: P.purple }}>{fmt(s.trailingYear)}</div><div className="sub">{fmt(s.activeDays)} active days overall</div></div>
        <div className="tile"><div className="label">Busiest day</div><div className="value" style={{ color: P.gold }}>{s.peakDay ? fmt(s.peakDay.count) : '—'}</div><div className="sub">{s.peakDay?.date ?? ''}</div></div>
      </div>
    </>
  );
}
