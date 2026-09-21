'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { fmt } from '@/lib/analytics';
import type { AsyncState, YearComposition } from '@/lib/types';

const AXIS = { fill: '#8b8070', fontSize: 11 };

export function ContributionComposition({ state }: { state: AsyncState<YearComposition[]> }) {
  return (
    <Card title="Contribution composition" meta="By type · per year">
      <Async state={state} isEmpty={(d) => d.length === 0}>
        {(rows) => (
          <>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#21262d" vertical={false} />
                  <XAxis dataKey="year" tick={AXIS} stroke="#21262d" />
                  <YAxis tick={AXIS} width={40} stroke="#21262d" />
                  <Tooltip
                    contentStyle={{ background: '#161b22', border: '1px solid #21262d', fontSize: 12 }}
                    labelStyle={{ color: '#f0c040' }}
                    formatter={(v: number, name: string) => [fmt(v), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8b8070' }} />
                  <Bar dataKey="other" name="Commits & other (calculated)" stackId="a" fill="#6e7681" />
                  <Bar dataKey="issues" name="Issues" stackId="a" fill="#f0c040" />
                  <Bar dataKey="prs" name="Pull requests" stackId="a" fill="#a371f7" />
                  <Bar dataKey="reviews" name="Reviews" stackId="a" fill="#39d353" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="note">
              <b>Measured:</b> pull requests, issues and reviews come from GitHub search, counted by creation date.{' '}
              <b>Calculated:</b> “Commits &amp; other” is the yearly contribution total minus those three, so it also absorbs
              anything the public API can't split out.
            </p>
          </>
        )}
      </Async>
    </Card>
  );
}
