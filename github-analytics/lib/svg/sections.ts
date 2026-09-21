/**
 * One function per dashboard section, returning SVG. All numbers come from lib/analytics.ts,
 * the same calculations the interactive React components use.
 */
import {
  MONTHS,
  WEEKDAYS,
  contributionStats,
  fmt,
  languageColor,
  languageShares,
  monthTotals,
  rankRepos,
  rollingYear,
  totalStars,
  weekdayTotals,
  weekendShare,
  yearGrid,
  yearsOf,
} from '../analytics';
import { HEAT_RAMPS, MONTH_COLORS, P, STAT_COLORS, WEEKDAY_COLORS } from '../palette';
import type { ContribData, Counts, GhRepo, LanguageBytes, Res } from '../types';
import { Block, C, INNER, circle, line, message, meta, note, rect, text, tile, trunc } from './kit';

// ---------- 1. stats (top card) ----------

function ring(cx: number, cy: number, r: number, pct: number, color: string): string {
  const c = 2 * Math.PI * r;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#21262d" stroke-width="9"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" ` +
    `stroke-dasharray="${((Math.min(100, pct) / 100) * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`
  );
}

export function stats(repos: Res<GhRepo[]>, contrib: Res<ContribData>, counts: Res<Counts>, bytes: Res<LanguageBytes>): Block {
  if (!contrib.ok) return message(contrib.error);
  const s = contributionStats(contrib.v.days);
  const num = (n: number | undefined) => (n === undefined ? '—' : fmt(n));

  const rows: [string, string, string][] = [
    ['Total Stars Earned', repos.ok ? fmt(totalStars(repos.v, true)) : '—', STAT_COLORS.stars],
    ['Total Commits', num(counts.ok ? counts.v.commits : undefined), STAT_COLORS.commits],
    ['Total PRs', num(counts.ok ? counts.v.prs : undefined), STAT_COLORS.prs],
    ['Total Issues', num(counts.ok ? counts.v.issues : undefined), STAT_COLORS.issues],
    ['Contributed to (others)', num(contrib.v.contributedTo), STAT_COLORS.contributed],
  ];

  let body = text(0, 16, 'Overview', { size: 13, weight: 700, fill: P.gold });
  rows.forEach(([label, value, color], i) => {
    const y = 52 + i * 36;
    body += circle(6, y - 5, 5.5, color) + text(20, y, label, { size: 12 }) + text(320, y, value, { size: 14, weight: 700, fill: color, anchor: 'end' });
  });

  // ring: contribution frequency
  body += ring(420, 104, 54, s.frequency, P.green);
  body += text(420, 114, `${s.frequency.toFixed(0)}%`, { size: 26, weight: 700, fill: P.green, anchor: 'middle' });
  body += text(420, 132, 'ACTIVE DAYS', { size: 8, fill: C.muted, anchor: 'middle', spacing: 0.6 });

  // languages
  const langs = repos.ok ? languageShares(bytes.ok ? bytes.v : null, repos.v).rows.slice(0, 8) : [];
  const lx = 520;
  const lw = INNER - lx;
  body += text(lx, 16, 'Most Used Languages', { size: 13, weight: 700, fill: P.cyan });
  body += rect(lx, 32, lw, 12, C.card2, 6);
  let cx = lx;
  langs.forEach((l) => {
    const w = (l.percent / 100) * lw;
    body += rect(cx, 32, w, 12, languageColor(l.name), 0);
    cx += w;
  });
  langs.forEach((l, i) => {
    const x = lx + (i % 2) * (lw / 2);
    const y = 80 + Math.floor(i / 2) * 32;
    body += circle(x + 5, y - 5, 5.5, languageColor(l.name)) + text(x + 18, y, trunc(l.name, 11), { size: 12 }) + text(x + lw / 2 - 14, y, `${l.percent.toFixed(1)}%`, { size: 12, anchor: 'end', fill: C.muted });
  });
  if (!langs.length) body += text(lx, 80, 'No language data.', { size: 11, fill: C.muted });

  // big three
  const y0 = 236;
  body += line(0, y0 - 12, INNER, y0 - 12);
  body += line(INNER / 3, y0, INNER / 3, y0 + 176) + line((INNER * 2) / 3, y0, (INNER * 2) / 3, y0 + 176);
  const c1 = INNER / 6;
  const c2 = INNER / 2;
  const c3 = (INNER * 5) / 6;
  body +=
    text(c1, y0 + 74, fmt(s.total), { size: 40, weight: 700, fill: P.blue, anchor: 'middle' }) +
    text(c1, y0 + 112, 'Total Contributions', { size: 14, anchor: 'middle' }) +
    text(c1, y0 + 138, `${contrib.v.days[0]?.date ?? ''} → present`, { size: 10.5, fill: C.muted, anchor: 'middle' });
  body +=
    ring(c2, y0 + 56, 46, (s.currentStreak / Math.max(s.longestStreak, 1)) * 100, P.orange) +
    text(c2, y0 + 68, String(s.currentStreak), { size: 30, weight: 700, fill: P.orange, anchor: 'middle' }) +
    text(c2, y0 + 130, 'Current Streak', { size: 14, weight: 700, fill: P.orange, anchor: 'middle' }) +
    text(c2, y0 + 154, s.currentStreakRange ?? 'No active streak', { size: 10.5, fill: C.muted, anchor: 'middle' });
  body +=
    text(c3, y0 + 74, String(s.longestStreak), { size: 40, weight: 700, fill: P.pink, anchor: 'middle' }) +
    text(c3, y0 + 112, 'Longest Streak', { size: 14, anchor: 'middle' }) +
    text(c3, y0 + 138, s.longestStreakRange ?? '', { size: 10.5, fill: C.muted, anchor: 'middle' });

  // extra tiles
  const ty = y0 + 200;
  const gap = 10;
  const tw = (INNER - gap * 3) / 4;
  const tiles: [string, string, string, string][] = [
    ['Average per day', s.avgPerDay.toFixed(1), 'Last 12 months', P.cyan],
    ['Frequency', `${s.frequency.toFixed(0)}%`, 'Days with activity', P.green],
    ['Last 12 months', fmt(s.trailingYear), `${fmt(s.activeDays)} active days`, P.purple],
    ['Busiest day', s.peakDay ? fmt(s.peakDay.count) : '—', s.peakDay?.date ?? '', P.gold],
  ];
  tiles.forEach(([l, v, sub, color], i) => (body += tile(i * (tw + gap), ty, tw, 88, l, v, sub, color)));
  return { h: ty + 88, body };
}

// ---------- 2. momentum ----------

export function momentum(contrib: Res<ContribData>): Block {
  if (!contrib.ok) return message(contrib.error);
  const series = rollingYear(contrib.v.days);
  if (series.length < 3) return message('Not enough history yet.', false);
  const left = 56;
  const top = 10;
  const ch = 170;
  const cw = INNER - left - 6;
  const max = Math.max(...series.map((s) => s.value), 1);
  const pt = (i: number, v: number) => [left + (i / (series.length - 1)) * cw, top + ch - (v / max) * ch] as const;
  const path = series.map((s, i) => pt(i, s.value)).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${path} L${left + cw} ${top + ch} L${left} ${top + ch} Z`;

  let grid = '';
  for (const f of [0, 0.5, 1]) {
    const y = top + ch - f * ch;
    grid += line(left, y, left + cw, y) + text(left - 6, y + 3, fmt(Math.round(max * f)), { size: 9, fill: C.muted, anchor: 'end' });
  }
  let ticks = '';
  let lastYear = '';
  series.forEach((s, i) => {
    const y = s.date.slice(0, 4);
    if (y !== lastYear && s.date.slice(5, 7) <= '01') ticks += text(pt(i, 0)[0], top + ch + 20, y, { size: 9, fill: C.muted, anchor: 'middle' });
    lastYear = y;
  });
  const st = contributionStats(contrib.v.days);
  const peak = series.reduce((p, s) => (s.value > p.value ? s : p), series[0]);
  const body =
    `<defs><linearGradient id="mom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.purple}" stop-opacity=".5"/><stop offset="1" stop-color="${P.blue}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="momStroke" gradientUnits="userSpaceOnUse" x1="${left}" y1="0" x2="${left + cw}" y2="0"><stop offset="0" stop-color="${P.cyan}"/><stop offset=".5" stop-color="${P.blue}"/><stop offset="1" stop-color="${P.pink}"/></linearGradient></defs>` +
    grid +
    `<path d="${area}" fill="url(#mom)"/>` +
    `<path d="${path}" fill="none" stroke="url(#momStroke)" stroke-width="2.5" stroke-linejoin="round"/>` +
    ticks +
    text(left + 10, top + 34, fmt(st.trailingYear), { size: 26, weight: 700, fill: P.pink }) +
    text(left + 10, top + 54, 'TRAILING 12 MONTHS', { size: 8.5, fill: C.muted, spacing: 0.6 }) +
    note(top + ch + 50, `${fmt(st.total)} since ${contrib.v.days[0].date}. Peak rolling year ${fmt(peak.value)} (${peak.date}).`);
  return { h: top + ch + 62, body };
}

// ---------- 3. lifetime history ----------

export function heatmap(contrib: Res<ContribData>): Block {
  if (!contrib.ok) return message(contrib.error);
  const years = yearsOf(contrib.v.days).reverse();
  const CELL = 13;
  const STEP = 16;
  const LEFT = 38;
  let y = 0;
  let body = '';
  years.forEach((yr, yi) => {
    const ramp = HEAT_RAMPS[yi % HEAT_RAMPS.length];
    const weeks = yearGrid(contrib.v.days, yr);
    body += text(0, y + 12, `${yr} · ${fmt(contrib.v.totals[String(yr)] ?? 0)} contributions`, { size: 10, fill: ramp[4] });
    let prev = -1;
    weeks.forEach((wk, i) => {
      const first = wk.find(Boolean);
      if (!first) return;
      const m = Number(first.date.slice(5, 7)) - 1;
      if (m !== prev) {
        body += text(LEFT + i * STEP, y + 32, MONTHS[m], { size: 9, fill: C.muted });
        prev = m;
      }
    });
    for (const d of [1, 3, 5]) body += text(0, y + 40 + d * STEP + 10, WEEKDAYS[d], { size: 9, fill: C.muted });
    weeks.forEach((wk, wi) =>
      wk.forEach((d, di) => {
        if (d) body += rect(LEFT + wi * STEP, y + 40 + di * STEP, CELL, CELL, ramp[d.level], 2.5);
      }),
    );
    y += 40 + 7 * STEP + 18;
  });
  body += text(INNER - 5 * 18 - 74, y + 10, 'Less', { size: 9, fill: C.muted });
  HEAT_RAMPS[0].forEach((f, i) => (body += rect(INNER - 5 * 18 - 30 + i * 18, y, 13, 13, f, 2.5)));
  body += text(INNER, y + 10, 'More', { size: 9, fill: C.muted, anchor: 'end' });
  return { h: y + 20, body };
}

// ---------- 4. rhythm ----------

export function rhythm(contrib: Res<ContribData>): Block {
  if (!contrib.ok) return message(contrib.error);
  const week = weekdayTotals(contrib.v.days);
  const month = monthTotals(contrib.v.days);
  const maxW = Math.max(...week, 1);
  const maxM = Math.max(...month, 1);
  let body = meta(0, 12, 'By weekday') + meta(520, 12, 'By month');
  [1, 2, 3, 4, 5, 6, 0].forEach((d, i) => {
    const y = 30 + i * 30;
    body +=
      text(0, y + 12, WEEKDAYS[d], { size: 11, fill: WEEKDAY_COLORS[d] }) +
      rect(52, y, 310, 15, C.card2, 4) +
      rect(52, y, (week[d] / maxW) * 310, 15, WEEKDAY_COLORS[d], 4) +
      text(440, y + 12, fmt(week[d]), { size: 10.5, anchor: 'end', fill: C.muted });
  });
  const colW = 32.5;
  month.forEach((v, i) => {
    const h = Math.max(2, (v / maxM) * 150);
    const x = 520 + i * colW;
    body += rect(x, 30 + 158 - h, colW - 6, h, MONTH_COLORS[i], 3) + text(x + (colW - 6) / 2, 30 + 180, MONTHS[i][0], { size: 10, fill: MONTH_COLORS[i], anchor: 'middle' });
  });
  body += note(262, `${weekendShare(contrib.v.days).toFixed(0)}% of contributions land on weekends.`);
  return { h: 276, body };
}

// ---------- 5. repository analysis ----------

export function repositories(res: Res<GhRepo[]>): Block {
  if (!res.ok) return message(res.error);
  const rows = rankRepos([...res.v], 'stars').slice(0, 8);
  if (!rows.length) return message('No public repositories.', false);
  const cols = { name: 0, lang: 330, stars: 560, forks: 640, size: 750, upd: INNER };
  let body =
    meta(cols.name, 12, 'Repository') + meta(cols.lang, 12, 'Language') +
    meta(cols.stars, 12, 'Stars', 'end') + meta(cols.forks, 12, 'Forks', 'end') +
    meta(cols.size, 12, 'Size', 'end') + meta(cols.upd, 12, 'Updated', 'end');
  rows.forEach((r, i) => {
    const y = 26 + i * 34;
    body += line(0, y, INNER, y);
    body += text(cols.name, y + 22, trunc(r.name, 24), { size: 11.5, fill: P.gold });
    if (r.language) body += circle(cols.lang + 5, y + 17, 5, languageColor(r.language)) + text(cols.lang + 16, y + 22, trunc(r.language, 12), { size: 11 });
    else body += text(cols.lang, y + 22, '—', { size: 11, fill: C.muted });
    body += text(cols.stars, y + 22, fmt(r.stargazers_count), { size: 11, anchor: 'end', fill: P.gold });
    body += text(cols.forks, y + 22, fmt(r.forks_count), { size: 11, anchor: 'end', fill: P.blue });
    body += text(cols.size, y + 22, r.size >= 1024 ? `${(r.size / 1024).toFixed(1)} MB` : `${r.size} KB`, { size: 11, anchor: 'end' });
    body += text(cols.upd, y + 22, r.pushed_at.slice(0, 10), { size: 11, anchor: 'end', fill: C.muted });
  });
  body += note(26 + rows.length * 34 + 24, 'Ranked by stars. Per-repository commit counts need authentication.');
  return { h: 26 + rows.length * 34 + 34, body };
}

// ---------- 6. portfolio ----------

export function portfolio(res: Res<GhRepo[]>): Block {
  if (!res.ok) return message(res.error);
  const rows = rankRepos([...res.v], 'pushed').slice(0, 12);
  if (!rows.length) return message('No public repositories.', false);
  const label = 250;
  const rowH = 28;
  const start = Math.min(...rows.map((r) => new Date(r.created_at).getTime()));
  const end = Date.now();
  const x = (t: number) => label + ((t - start) / Math.max(1, end - start)) * (INNER - label - 10);
  let body = '';
  for (let y = new Date(start).getFullYear() + 1; y <= new Date(end).getFullYear(); y++) {
    const tx = x(new Date(`${y}-01-01`).getTime());
    body += line(tx, 0, tx, rows.length * rowH) + text(tx, rows.length * rowH + 20, y, { size: 9.5, fill: C.muted, anchor: 'middle' });
  }
  rows.forEach((r, i) => {
    const y = i * rowH + rowH / 2;
    const a = x(new Date(r.created_at).getTime());
    const b = Math.max(a + 4, x(new Date(r.pushed_at).getTime()));
    const color = r.archived ? C.grey : r.language ? languageColor(r.language) : P.green;
    body +=
      circle(7, y, 5, r.language ? languageColor(r.language) : C.grey) +
      text(22, y + 5, trunc(r.name, 21), { size: 11 }) +
      `<line x1="${a.toFixed(1)}" y1="${y}" x2="${b.toFixed(1)}" y2="${y}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>` +
      circle(b, y, 3.5, color);
  });
  body += note(rows.length * rowH + 48, 'Bars run from creation to last push, coloured by language. Grey = archived.');
  return { h: rows.length * rowH + 58, body };
}
