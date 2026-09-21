'use client';

import { useMemo } from 'react';
import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { WEEKDAYS, fmt, punchCard } from '@/lib/analytics';
import type { AsyncState, PushSample } from '@/lib/types';

const CELL = 24;
const LEFT = 34;
const TOP = 6;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function CommitCadence({ state }: { state: AsyncState<PushSample[]> }) {
  return (
    <Card title="Commit cadence" meta="Recent public pushes · your local time">
      <Async state={state} isEmpty={(s) => s.length === 0} emptyText="No public pushes in the last 90 days.">
        {(s) => <Punch samples={s} />}
      </Async>
    </Card>
  );
}

function Punch({ samples }: { samples: PushSample[] }) {
  const grid = useMemo(() => punchCard(samples), [samples]);
  const total = samples.reduce((a, s) => a + s.commits, 0);
  const max = Math.max(...grid.flat(), 1);
  const byHour = HOURS.map((h) => grid.reduce((a, row) => a + row[h], 0));
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const width = LEFT + 24 * CELL;
  const height = TOP + 7 * CELL + 18;

  return (
    <>
      <div className="scroll-x">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 560, height: 'auto', display: 'block' }} role="img" aria-label="Commits by weekday and hour">
          {ORDER.map((d, r) => (
            <text key={d} x={0} y={TOP + r * CELL + CELL / 2 + 4} fill="#8b8070" fontSize={10}>
              {WEEKDAYS[d]}
            </text>
          ))}
          {HOURS.filter((h) => h % 3 === 0).map((h) => (
            <text key={h} x={LEFT + h * CELL + CELL / 2} y={height - 4} fill="#8b8070" fontSize={10} textAnchor="middle">
              {h}
            </text>
          ))}
          {ORDER.map((d, r) =>
            HOURS.map((h) => {
              const v = grid[d][h];
              return (
                <circle
                  key={`${d}-${h}`}
                  cx={LEFT + h * CELL + CELL / 2}
                  cy={TOP + r * CELL + CELL / 2}
                  r={v ? 2.5 + (v / max) * 8.5 : 1.5}
                  fill={v ? '#39d353' : '#21262d'}
                  opacity={v ? 0.5 + (v / max) * 0.5 : 1}
                >
                  <title>{`${WEEKDAYS[d]} ${h}:00 — ${v} commits`}</title>
                </circle>
              );
            }),
          )}
        </svg>
      </div>
      <p className="note">
        <b>Commit</b> activity only, from the public events feed: {fmt(total)} commits across {fmt(samples.length)} pushes. Busiest hour:{' '}
        <b>{peakHour}:00</b>. GitHub only exposes about the last 90 days, so this is a recent sample, not lifetime history.
      </p>
    </>
  );
}
