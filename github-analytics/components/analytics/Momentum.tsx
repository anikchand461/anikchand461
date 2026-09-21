'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { contributionStats, fmt, rollingYear } from '@/lib/analytics';
import { P } from '@/lib/palette';
import type { AsyncState, ContribData } from '@/lib/types';

const AXIS = { fill: '#8b8070', fontSize: 13 };

export function Momentum({ state }: { state: AsyncState<ContribData> }) {
  return (
    <Card title="Momentum" meta="Rolling 12 months · all contribution types" accent={P.blue}>
      <Async state={state} isEmpty={(c) => c.days.length < 14} emptyText="Not enough history yet.">
        {(c) => <MomentumChart data={c} />}
      </Async>
    </Card>
  );
}

function MomentumChart({ data }: { data: ContribData }) {
  const series = useMemo(() => rollingYear(data.days), [data]);
  const stats = useMemo(() => contributionStats(data.days), [data]);
  const peak = series.reduce((p, s) => (s.value > p.value ? s : p), series[0]);
  return (
    <>
      <div className="tile" style={{ display: 'inline-block', marginBottom: 12 }}>
        <div className="label">Trailing 12 months</div>
        <div className="value" style={{ color: P.pink }}>{fmt(stats.trailingYear)}</div>
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.purple} stopOpacity={0.5} />
                <stop offset="100%" stopColor={P.blue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="momStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={P.cyan} />
                <stop offset="50%" stopColor={P.blue} />
                <stop offset="100%" stopColor={P.pink} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#21262d" vertical={false} />
            <XAxis dataKey="date" tick={AXIS} tickFormatter={(d: string) => d.slice(0, 7)} minTickGap={48} stroke="#21262d" />
            <YAxis tick={AXIS} width={40} stroke="#21262d" />
            <Tooltip
              contentStyle={{ background: '#161b22', border: '1px solid #21262d', fontSize: 14 }}
              labelStyle={{ color: '#f0c040' }}
              formatter={(v: number) => [fmt(v), 'Rolling 12 mo']}
            />
            <Area type="monotone" dataKey="value" stroke="url(#momStroke)" strokeWidth={2.5} fill="url(#mom)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="note">
        {fmt(stats.total)} contributions since {data.days[0].date}. Peak rolling year: <b>{fmt(peak.value)}</b> ({peak.date}).
        Historical only; no projection.
      </p>
    </>
  );
}
