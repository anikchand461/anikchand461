'use client';

import { useMemo } from 'react';
import { ResponsiveContainer, Treemap } from 'recharts';
import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { fmt, languageColor, languageShares } from '@/lib/analytics';
import type { AsyncState, GhRepo, LanguageBytes } from '@/lib/types';

interface Props {
  repos: AsyncState<GhRepo[]>;
  bytes: AsyncState<LanguageBytes>;
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  percent?: number;
}

function Cell({ x = 0, y = 0, width = 0, height = 0, name = '', percent = 0 }: CellProps) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={4} fill={languageColor(name)} stroke="#0d1117" strokeWidth={2} />
      {width > 64 && height > 34 && (
        <>
          <text x={x + 8} y={y + 18} fill="#0d1117" fontSize={12} fontWeight={700}>{name}</text>
          <text x={x + 8} y={y + 33} fill="#0d1117" fontSize={11}>{percent.toFixed(1)}%</text>
        </>
      )}
    </g>
  );
}

export function LanguageAnalysis({ repos, bytes }: Props) {
  // Bytes are best; if that call failed (e.g. rate limit) fall back to repo counts from the repo list.
  const combined: AsyncState<{ bytes: LanguageBytes | null; repos: GhRepo[] }> =
    repos.status === 'ready' && bytes.status !== 'loading'
      ? { status: 'ready', data: { bytes: bytes.status === 'ready' ? bytes.data : null, repos: repos.data } }
      : repos.status === 'error'
        ? { status: 'error', error: repos.error }
        : { status: 'loading' };

  return (
    <Card title="Languages" meta="Public source repositories">
      <Async state={combined} isEmpty={(d) => languageShares(d.bytes, d.repos).rows.length === 0} emptyText="No language data.">
        {(d) => <Body bytes={d.bytes} repos={d.repos} />}
      </Async>
    </Card>
  );
}

function Body({ bytes, repos }: { bytes: LanguageBytes | null; repos: GhRepo[] }) {
  const { unit, rows } = useMemo(() => languageShares(bytes, repos), [bytes, repos]);
  const data = rows.slice(0, 12).map((r) => ({ name: r.name, size: r.value, percent: r.percent }));
  const show = (v: number) => (unit === 'bytes' ? (v >= 1e6 ? `${(v / 1e6).toFixed(1)} MB` : `${(v / 1e3).toFixed(0)} KB`) : `${fmt(v)} repos`);
  return (
    <>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <Treemap data={data} dataKey="size" content={<Cell />} isAnimationActive={false} />
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 12 }}>
        {rows.slice(0, 8).map((r) => (
          <div className="bar-row" key={r.name} style={{ gridTemplateColumns: '120px 1fr 90px' }}>
            <span><span className="dot" style={{ background: languageColor(r.name) }} />{r.name}</span>
            <div className="bar"><i style={{ width: `${r.percent}%`, background: languageColor(r.name) }} /></div>
            <span style={{ textAlign: 'right' }}>{r.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <p className="note">
        {unit === 'bytes'
          ? <>Measured in <b>bytes</b> across your {`largest`} original repositories (each needs one API call, so it's capped). {show(rows.reduce((a, r) => a + r.value, 0))} total.</>
          : <>Byte counts weren't available, so this shows <b>repository count</b> by primary language instead.</>}
      </p>
    </>
  );
}
