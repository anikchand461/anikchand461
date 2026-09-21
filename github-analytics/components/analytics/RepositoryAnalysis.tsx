'use client';

import { useMemo, useState } from 'react';
import { Async } from '@/components/ui/Async';
import { Card } from '@/components/ui/Card';
import { RepoSort, fmt, languageColor, rankRepos } from '@/lib/analytics';
import type { AsyncState, GhRepo } from '@/lib/types';

const SORTS: { id: RepoSort; label: string }[] = [
  { id: 'stars', label: 'Stars' },
  { id: 'forks', label: 'Forks' },
  { id: 'pushed', label: 'Updated' },
  { id: 'size', label: 'Size' },
];

export function RepositoryAnalysis({ state }: { state: AsyncState<GhRepo[]> }) {
  const [sort, setSort] = useState<RepoSort>('stars');
  return (
    <Card title="Top repositories" meta={`Sorted by ${SORTS.find((s) => s.id === sort)!.label.toLowerCase()} · forks excluded`}>
      <Async state={state} isEmpty={(r) => r.filter((x) => !x.fork).length === 0} emptyText="No public repositories.">
        {(repos) => <Table repos={repos} sort={sort} onSort={setSort} />}
      </Async>
    </Card>
  );
}

function Table({ repos, sort, onSort }: { repos: GhRepo[]; sort: RepoSort; onSort: (s: RepoSort) => void }) {
  const rows = useMemo(() => rankRepos([...repos], sort).slice(0, 10), [repos, sort]);
  return (
    <>
      <div className="seg" role="group" aria-label="Sort repositories" style={{ marginBottom: 10 }}>
        {SORTS.map((s) => (
          <button key={s.id} aria-pressed={sort === s.id} onClick={() => onSort(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="scroll-x">
        <table className="repos">
          <thead>
            <tr>
              <th>Repository</th>
              <th>Language</th>
              <th className="num" style={{ textAlign: 'right' }}>Stars</th>
              <th className="num" style={{ textAlign: 'right' }}>Forks</th>
              <th className="num" style={{ textAlign: 'right' }}>Size</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.full_name}>
                <td>
                  <a href={r.html_url} target="_blank" rel="noreferrer">{r.name}</a>
                  {r.archived && <span className="meta"> · archived</span>}
                </td>
                <td>
                  {r.language ? (
                    <>
                      <span className="dot" style={{ background: languageColor(r.language) }} />
                      {r.language}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="num">{fmt(r.stargazers_count)}</td>
                <td className="num">{fmt(r.forks_count)}</td>
                <td className="num">{r.size >= 1024 ? `${(r.size / 1024).toFixed(1)} MB` : `${r.size} KB`}</td>
                <td>{r.pushed_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        Per-repository commit counts aren't available without authentication, so ranking uses stars, forks, last push and size.
      </p>
    </>
  );
}
