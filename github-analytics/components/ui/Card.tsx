import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  meta?: string;
  children: ReactNode;
}

export function Card({ title, meta, children }: CardProps) {
  return (
    <section className="card" aria-label={title}>
      <div className="card-head">
        <h2>{title}</h2>
        {meta && <span className="meta">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

export function SectionTag({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="tag" id={id}>
      <b>{id}</b>— {children}
    </div>
  );
}

export function Tile({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className={`value${gold ? ' gold' : ''}`}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
