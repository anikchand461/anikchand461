'use client';

import { useMemo } from 'react';
import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { MONTHS, WEEKDAYS, fmt, yearGrid, yearsOf } from '@/lib/analytics';
import type { AsyncState, ContribData, ContribDay } from '@/lib/types';

const LEVEL_FILL = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
const CELL = 10;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 26;
const TOP = 16;

export function LifetimeHeatmap({ state }: { state: AsyncState<ContribData> }) {
  return (
    <Card title="Contribution history" meta="By day · one grid per year · public">
      <Async state={state} isEmpty={(c) => c.days.length === 0}>
        {(c) => <Years data={c} />}
      </Async>
    </Card>
  );
}

function Years({ data }: { data: ContribData }) {
  const years = useMemo(() => yearsOf(data.days).reverse(), [data]);
  return (
    <>
      <div style={{ display: 'grid', gap: 18 }}>
        {years.map((y) => (
          <YearGrid key={y} year={y} days={data.days} total={data.totals[String(y)] ?? 0} />
        ))}
      </div>
      <div className="legend" aria-label="Legend" style={{ alignItems: 'center' }}>
        Less
        {LEVEL_FILL.map((f, i) => (
          <span key={i} style={{ ['--c' as string]: f, margin: 0 }} aria-hidden />
        ))}
        More
      </div>
    </>
  );
}

function YearGrid({ year, days, total }: { year: number; days: ContribDay[]; total: number }) {
  const weeks = useMemo(() => yearGrid(days, year), [days, year]);
  const width = LEFT + weeks.length * STEP;
  const height = TOP + 7 * STEP;

  // Label a month at the first week whose first real day falls in that month.
  const labels: { x: number; text: string }[] = [];
  let prev = -1;
  weeks.forEach((w, i) => {
    const first = w.find(Boolean);
    if (!first) return;
    const m = Number(first.date.slice(5, 7)) - 1;
    if (m !== prev) {
      labels.push({ x: LEFT + i * STEP, text: MONTHS[m] });
      prev = m;
    }
  });

  return (
    <div>
      <div className="meta" style={{ marginBottom: 4 }}>
        {year} · {fmt(total)} contributions
      </div>
      <div className="scroll-x">
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 560, height: 'auto', display: 'block' }} role="img" aria-label={`Contribution grid for ${year}`}>
          {labels.map((l) => (
            <text key={l.text + l.x} x={l.x} y={10} fill="#8b8070" fontSize={9}>
              {l.text}
            </text>
          ))}
          {[1, 3, 5].map((d) => (
            <text key={d} x={0} y={TOP + d * STEP + CELL - 1} fill="#8b8070" fontSize={9}>
              {WEEKDAYS[d]}
            </text>
          ))}
          {weeks.map((w, wi) =>
            w.map((d, di) =>
              d ? (
                <rect key={d.date} x={LEFT + wi * STEP} y={TOP + di * STEP} width={CELL} height={CELL} rx={2} fill={LEVEL_FILL[d.level]}>
                  <title>{`${d.date}: ${d.count} contributions`}</title>
                </rect>
              ) : null,
            ),
          )}
        </svg>
      </div>
    </div>
  );
}
