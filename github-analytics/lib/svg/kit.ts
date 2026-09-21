/** Small SVG string helpers shared by every section of the README image. */
import { BG, P } from '../palette';

export const W = 1000;
export const PAD = 24;
export const CARD_W = W - PAD * 2; // 952
export const INNER = CARD_W - 36; // 916, content width inside a card

export const C = {
  bg: BG,
  card: BG,
  card2: '#161b22',
  border: '#30363d',
  text: '#e2d9c0',
  muted: '#8b8070',
  gold: P.gold,
  green: P.green,
  grey: '#6e7681',
  purple: P.purple,
  err: '#f85149',
};

const FONT = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

export interface Block {
  h: number;
  body: string;
}

export const esc = (s: string | number) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

interface TextOpts {
  size?: number;
  fill?: string;
  weight?: number | string;
  anchor?: 'start' | 'middle' | 'end';
  spacing?: number;
}

export function text(x: number, y: number, s: string | number, o: TextOpts = {}): string {
  const { size = 11, fill = C.text, weight = 400, anchor = 'start', spacing } = o;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${
    spacing ? ` letter-spacing="${spacing}"` : ''
  }>${esc(s)}</text>`;
}

export function rect(x: number, y: number, w: number, h: number, fill: string, rx = 0, extra = ''): string {
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${rx}" fill="${fill}"${extra ? ` ${extra}` : ''}/>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, stroke = C.border, sw = 1): string {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

export function circle(cx: number, cy: number, r: number, fill: string, opacity = 1): string {
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity.toFixed(2)}"` : ''}/>`;
}

export const group = (x: number, y: number, body: string) => `<g transform="translate(${x} ${y})">${body}</g>`;

export const meta = (x: number, y: number, s: string, anchor: 'start' | 'end' = 'start') =>
  text(x, y, s.toUpperCase(), { size: 9, fill: C.muted, anchor, spacing: 0.8 });

/** Section label between cards, like "overview — profile stat tiles" on the dashboard. */
export function tag(id: string, desc: string, color: string = C.gold): Block {
  const idW = id.length * 6.6 + 16;
  return {
    h: 34,
    body:
      rect(0, 8, idW, 18, C.card2, 4, `stroke="${color}" stroke-opacity=".7"`) +
      text(8, 21, id, { size: 10.5, fill: color, weight: 700 }) +
      text(idW + 8, 21, `— ${desc}`, { size: 10.5, fill: C.muted }),
  };
}

export function card(title: string, metaText: string, content: Block, accent: string = C.gold): Block {
  const h = 44 + content.h + 16;
  return {
    h,
    body:
      rect(0.5, 0.5, CARD_W - 1, h - 1, C.card, 10, `stroke="${C.border}"`) +
      rect(12, 0.5, CARD_W - 24, 3, accent, 1.5) +
      text(18, 27, title, { size: 13.5, weight: 700, fill: accent }) +
      meta(CARD_W - 18, 26, metaText, 'end') +
      group(18, 44, content.body),
  };
}

export function tile(x: number, y: number, w: number, h: number, label: string, value: string, sub?: string, color: string = C.text): string {
  return (
    rect(x, y, w, h, C.card2, 8, `stroke="${C.border}"`) +
    text(x + 12, y + 20, label, { size: 10.5, fill: C.muted }) +
    text(x + 12, y + 46, value, { size: 24, weight: 700, fill: color }) +
    (sub ? text(x + 12, y + h - 9, trunc(sub.toUpperCase(), Math.floor((w - 20) / 5.6)), { size: 8.5, fill: C.muted, spacing: 0.5 }) : '')
  );
}

export function message(msg: string, isError = true): Block {
  return { h: 70, body: text(INNER / 2, 40, msg, { size: 11.5, anchor: 'middle', fill: isError ? C.err : C.muted }) };
}

export function note(y: number, s: string): string {
  return text(0, y, s, { size: 10, fill: C.muted });
}

// ---------- squarified treemap ----------

export interface TreeItem {
  name: string;
  value: number;
}
export interface TreeRect extends TreeItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function treemap(items: TreeItem[], w: number, h: number): TreeRect[] {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return [];
  const scaled = items.map((i) => ({ ...i, area: (i.value / total) * w * h }));
  const out: TreeRect[] = [];
  let x = 0;
  let y = 0;
  let rw = w;
  let rh = h;
  let row: typeof scaled = [];

  const worst = (r: typeof scaled, side: number) => {
    const s = r.reduce((a, b) => a + b.area, 0);
    const max = Math.max(...r.map((i) => i.area));
    const min = Math.min(...r.map((i) => i.area));
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };

  const flush = () => {
    const s = row.reduce((a, b) => a + b.area, 0);
    if (rw >= rh) {
      const cw = s / rh;
      let cy = y;
      for (const r of row) {
        const ch = r.area / cw;
        out.push({ name: r.name, value: r.value, x, y: cy, w: cw, h: ch });
        cy += ch;
      }
      x += cw;
      rw -= cw;
    } else {
      const rhh = s / rw;
      let cx = x;
      for (const r of row) {
        const cw = r.area / rhh;
        out.push({ name: r.name, value: r.value, x: cx, y, w: cw, h: rhh });
        cx += cw;
      }
      y += rhh;
      rh -= rhh;
    }
  };

  for (const it of scaled) {
    const side = Math.min(rw, rh);
    if (!row.length || worst([...row, it], side) <= worst(row, side)) row.push(it);
    else {
      flush();
      row = [it];
    }
  }
  if (row.length) flush();
  return out;
}

export function wrapSvg(height: number, body: string, title: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" role="img" aria-label="${esc(title)}" font-family="${FONT}">` +
    `<title>${esc(title)}</title>` +
    rect(0, 0, W, height, C.bg, 0) +
    body +
    `</svg>`
  );
}
