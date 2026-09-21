'use client';

import { useMemo } from 'react';
import { Async } from '@/components/ui/Async';
import { Card, Tile } from '@/components/ui/Card';
import { contributionStats, fmt } from '@/lib/analytics';
import type { AsyncState, ContribData } from '@/lib/types';

export function Contributions({ state }: { state: AsyncState<ContribData> }) {
  return (
    <Card title="Contributions" meta="Streaks over all years · public">
      <Async state={state} isEmpty={(c) => c.days.length === 0}>
        {(c) => <Body data={c} />}
      </Async>
    </Card>
  );
}

function Body({ data }: { data: ContribData }) {
  const s = useMemo(() => contributionStats(data.days), [data]);
  return (
    <>
      <div className="grid g-3">
        <Tile gold label="Current streak" value={`${s.currentStreak} days`} sub={s.currentStreakRange ?? 'No active streak'} />
        <Tile label="Longest streak" value={`${s.longestStreak} days`} sub={s.longestStreakRange ?? undefined} />
        <Tile label="Total contributions" value={fmt(s.total)} sub={`${fmt(s.activeDays)} active days`} />
        <Tile label="Last 12 months" value={fmt(s.trailingYear)} />
        <Tile label="Average per day" value={s.avgPerDay.toFixed(1)} sub="Trailing 12 months" />
        <Tile label="Contribution frequency" value={`${s.frequency.toFixed(0)}%`} sub="Days with activity" />
      </div>
      {s.peakDay && (
        <p className="note">
          Busiest day: <b>{s.peakDay.date}</b> with {fmt(s.peakDay.count)} contributions.
        </p>
      )}
    </>
  );
}
