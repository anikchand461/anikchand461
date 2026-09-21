'use client';

import { useMemo } from 'react';
import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { MONTHS, WEEKDAYS, fmt, monthTotals, weekdayTotals, weekendShare } from '@/lib/analytics';
import { MONTH_COLORS, P, WEEKDAY_COLORS } from '@/lib/palette';
import type { AsyncState, ContribData } from '@/lib/types';

export function ActivityRhythm({ state }: { state: AsyncState<ContribData> }) {
  return (
    <Card title="Activity rhythm" meta="All contribution types · all years" accent={P.orange}>
      <Async state={state} isEmpty={(c) => c.days.length === 0}>
        {(c) => <Body data={c} />}
      </Async>
    </Card>
  );
}

function Body({ data }: { data: ContribData }) {
  const week = useMemo(() => weekdayTotals(data.days), [data]);
  const month = useMemo(() => monthTotals(data.days), [data]);
  const weekend = useMemo(() => weekendShare(data.days), [data]);
  const maxW = Math.max(...week, 1);
  const maxM = Math.max(...month, 1);
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first

  return (
    <>
      <div className="grid g-2" style={{ gap: 24 }}>
        <div>
          <div className="meta" style={{ marginBottom: 8 }}>By weekday</div>
          {order.map((d) => (
            <div className="bar-row" key={d}>
              <span>{WEEKDAYS[d]}</span>
              <div className="bar" role="img" aria-label={`${WEEKDAYS[d]}: ${week[d]}`}>
                <i style={{ width: `${(week[d] / maxW) * 100}%`, background: WEEKDAY_COLORS[d] }} />
              </div>
              <span style={{ textAlign: 'right' }}>{fmt(week[d])}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="meta" style={{ marginBottom: 8 }}>By month</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130 }}>
            {month.map((v, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }} title={`${MONTHS[i]}: ${fmt(v)}`}>
                <div style={{ height: Math.max(2, (v / maxM) * 110), background: MONTH_COLORS[i], borderRadius: 3 }} />
                <div className="meta" style={{ marginTop: 4 }}>{MONTHS[i][0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="note">
        <b>{weekend.toFixed(0)}%</b> of contributions land on weekends.
      </p>
    </>
  );
}
