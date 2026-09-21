'use client';

import { useMemo } from 'react';
import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { languageColor, rankRepos } from '@/lib/analytics';
import { P } from '@/lib/palette';
import type { AsyncState, GhRepo } from '@/lib/types';

const ROW = 24;
const LABEL = 170;
const RIGHT = 20;
const W = 860;

export function RepositoryPortfolio({ state }: { state: AsyncState<GhRepo[]> }) {
  return (
    <Card title="Portfolio" meta="Created → last push · most recently pushed" accent={P.pink}>
      <Async state={state} isEmpty={(r) => r.filter((x) => !x.fork).length === 0} emptyText="No public repositories.">
        {(repos) => <Timeline repos={repos} />}
      </Async>
    </Card>
  );
}

function Timeline({ repos }: { repos: GhRepo[] }) {
  const rows = useMemo(() => rankRepos([...repos], 'pushed').slice(0, 12), [repos]);
  const start = Math.min(...rows.map((r) => new Date(r.created_at).getTime()));
  const end = Date.now();
  const x = (t: number) => LABEL + ((t - start) / Math.max(1, end - start)) * (W - LABEL - RIGHT);
  const height = rows.length * ROW + 30;

  const firstYear = new Date(start).getFullYear();
  const ticks: number[] = [];
  for (let y = firstYear + 1; y <= new Date(end).getFullYear(); y++) ticks.push(y);

  return (
    <>
      <div className="scroll-x">
        <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', minWidth: 620, height: 'auto', display: 'block' }} role="img" aria-label="Repository timeline">
          {ticks.map((y) => {
            const tx = x(new Date(`${y}-01-01`).getTime());
            return (
              <g key={y}>
                <line x1={tx} x2={tx} y1={0} y2={rows.length * ROW} stroke="#21262d" />
                <text x={tx} y={height - 8} fill="#8b8070" fontSize={12} textAnchor="middle">{y}</text>
              </g>
            );
          })}
          {rows.map((r, i) => {
            const y = i * ROW + ROW / 2;
            const a = x(new Date(r.created_at).getTime());
            const b = Math.max(a + 4, x(new Date(r.pushed_at).getTime()));
            const color = r.archived ? '#6e7681' : r.language ? languageColor(r.language) : P.green;
            return (
              <g key={r.full_name}>
                <circle cx={6} cy={y} r={4} fill={r.language ? languageColor(r.language) : '#6e7681'} />
                <text x={16} y={y + 4} fill="#e2d9c0" fontSize={13}>
                  {r.name.length > 22 ? `${r.name.slice(0, 21)}…` : r.name}
                </text>
                <line x1={a} x2={b} y1={y} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round" />
                <circle cx={b} cy={y} r={3.5} fill={color}>
                  <title>{`${r.name}: created ${r.created_at.slice(0, 10)}, last push ${r.pushed_at.slice(0, 10)}${r.archived ? ' (archived)' : ''}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="note">
        Each bar runs from the repository's creation date to its last push (a proxy for active period). Grey = archived.
      </p>
    </>
  );
}
