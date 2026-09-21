/**
 * One function per dashboard section, returning SVG. All numbers come from lib/analytics.ts,
 * the same calculations the interactive React components use.
 */
import {
  GRADE_SCALE,
  MONTHS,
  WEEKDAYS,
  activityGrade,
  contributionStats,
  fmt,
  languageColor,
  monthTotals,
  rankRepos,
  recentOriginalRepos,
  rollingYear,
  totalStars,
  weekdayTotals,
  weekendShare,
  yearGrid,
  yearsOf,
} from '../analytics';
import type { ContribData, Counts, GhRepo, Res } from '../types';
import { Block, C, HEAT, INNER, circle, line, message, meta, note, rect, text, tile, trunc } from './kit';

// ---------- 2. momentum ----------

export function momentum(contrib: Res<ContribData>): Block {
  if (!contrib.ok) return message(contrib.error);
  const series = rollingYear(contrib.v.days);
  if (series.length < 3) return message('Not enough history yet.', false);
  const left = 44;
  const top = 8;
  const ch = 150;
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
    if (y !== lastYear && s.date.slice(5, 7) <= '01') {
      ticks += text(pt(i, 0)[0], top + ch + 16, y, { size: 9, fill: C.muted, anchor: 'middle' });
    }
    lastYear = y;
  });
  const stats = contributionStats(contrib.v.days);
  const peak = series.reduce((p, s) => (s.value > p.value ? s : p), series[0]);
  const body =
    `<defs><linearGradient id="mom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.green}" stop-opacity=".45"/><stop offset="1" stop-color="${C.green}" stop-opacity="0"/></linearGradient></defs>` +
    grid +
    `<path d="${area}" fill="url(#mom)"/>` +
    `<path d="${path}" fill="none" stroke="${C.green}" stroke-width="2" stroke-linejoin="round"/>` +
    ticks +
    text(left + 8, top + 26, fmt(stats.trailingYear), { size: 26, weight: 700, fill: C.gold }) +
    text(left + 8, top + 40, 'TRAILING 12 MONTHS', { size: 8.5, fill: C.muted, spacing: 0.6 }) +
    note(top + ch + 38, `${fmt(stats.total)} contributions since ${contrib.v.days[0].date}. Peak rolling year ${fmt(peak.value)} (${peak.date}).`);
  return { h: top + ch + 46, body };
}

// ---------- 3. contributions ----------

export function contributions(contrib: Res<ContribData>): Block {
  if (!contrib.ok) return message(contrib.error);
  const s = contributionStats(contrib.v.days);
  const gap = 10;
  const w = (INNER - gap * 2) / 3;
  const h = 70;
  const tiles: [string, string, string | undefined, boolean?][] = [
    ['Current streak', `${s.currentStreak} days`, s.currentStreakRange ?? 'No active streak', true],
    ['Longest streak', `${s.longestStreak} days`, s.longestStreakRange ?? undefined],
    ['Total contributions', fmt(s.total), `${fmt(s.activeDays)} active days`],
    ['Last 12 months', fmt(s.trailingYear), undefined],
    ['Average per day', s.avgPerDay.toFixed(1), 'Trailing 12 months'],
    ['Contribution frequency', `${s.frequency.toFixed(0)}%`, 'Days with activity'],
  ];
  const body =
    tiles.map(([l, v, sub, g], i) => tile((i % 3) * (w + gap), Math.floor(i / 3) * (h + gap), w, h, l, v, sub, g)).join('') +
    (s.peakDay ? note(h * 2 + gap + 18, `Busiest day: ${s.peakDay.date} with ${fmt(s.peakDay.count)} contributions.`) : '');
  return { h: h * 2 + gap + 26, body };
}

// ---------- 4. lifetime history ----------

export function heatmap(contrib: Res<ContribData>): Block {
  if (!contrib.ok) return message(contrib.error);
  const years = yearsOf(contrib.v.days).reverse();
  const CELL = 13;
  const STEP = 16;
  const LEFT = 30;
  let y = 0;
  let body = '';
  for (const yr of years) {
    const weeks = yearGrid(contrib.v.days, yr);
    body += text(0, y + 10, `${yr} · ${fmt(contrib.v.totals[String(yr)] ?? 0)} contributions`, { size: 10, fill: C.muted });
    let prev = -1;
    weeks.forEach((wk, i) => {
      const first = wk.find(Boolean);
      if (!first) return;
      const m = Number(first.date.slice(5, 7)) - 1;
      if (m !== prev) {
        body += text(LEFT + i * STEP, y + 24, MONTHS[m], { size: 9, fill: C.muted });
        prev = m;
      }
    });
    for (const d of [1, 3, 5]) body += text(0, y + 32 + d * STEP + 10, WEEKDAYS[d], { size: 9, fill: C.muted });
    weeks.forEach((wk, wi) =>
      wk.forEach((d, di) => {
        if (d) body += rect(LEFT + wi * STEP, y + 30 + di * STEP, CELL, CELL, HEAT[d.level], 2.5);
      }),
    );
    y += 30 + 7 * STEP + 14;
  }
  // legend
  body += text(INNER - 5 * 18 - 64, y + 9, 'Less', { size: 9, fill: C.muted });
  HEAT.forEach((f, i) => (body += rect(INNER - 5 * 18 - 30 + i * 18, y, 13, 13, f, 2.5)));
  body += text(INNER, y + 9, 'More', { size: 9, fill: C.muted, anchor: 'end' });
  return { h: y + 18, body };
}

// ---------- 6. rhythm ----------

export function rhythm(contrib: Res<ContribData>): Block {
  if (!contrib.ok) return message(contrib.error);
  const week = weekdayTotals(contrib.v.days);
  const month = monthTotals(contrib.v.days);
  const maxW = Math.max(...week, 1);
  const maxM = Math.max(...month, 1);
  let body = meta(0, 10, 'By weekday') + meta(500, 10, 'By month');
  [1, 2, 3, 4, 5, 6, 0].forEach((d, i) => {
    const y = 24 + i * 22;
    body +=
      text(0, y + 9, WEEKDAYS[d], { size: 11 }) +
      rect(40, y, 340, 11, C.card2, 3) +
      rect(40, y, (week[d] / maxW) * 340, 11, C.green, 3) +
      text(430, y + 9, fmt(week[d]), { size: 10.5, anchor: 'end', fill: C.muted });
  });
  const colW = 34;
  month.forEach((v, i) => {
    const h = Math.max(2, (v / maxM) * 110);
    const x = 500 + i * colW;
    body += rect(x, 24 + 118 - h, colW - 6, h, C.green, 3) + text(x + (colW - 6) / 2, 24 + 134, MONTHS[i][0], { size: 10, fill: C.muted, anchor: 'middle' });
  });
  body += note(196, `${weekendShare(contrib.v.days).toFixed(0)}% of contributions land on weekends. Time-of-day is under Commit cadence.`);
  return { h: 206, body };
}

// ---------- 8. repository analysis ----------

export function repositories(res: Res<GhRepo[]>): Block {
  if (!res.ok) return message(res.error);
  const rows = rankRepos([...res.v], 'stars').slice(0, 8);
  if (!rows.length) return message('No public repositories.', false);
  const cols = { name: 0, lang: 330, stars: 600, forks: 670, size: 760, upd: INNER };
  let body =
    meta(cols.name, 10, 'Repository') + meta(cols.lang, 10, 'Language') +
    meta(cols.stars, 10, 'Stars', 'end') + meta(cols.forks, 10, 'Forks', 'end') +
    meta(cols.size, 10, 'Size', 'end') + meta(cols.upd, 10, 'Updated', 'end');
  rows.forEach((r, i) => {
    const y = 20 + i * 26;
    body += line(0, y, INNER, y);
    body += text(cols.name, y + 17, trunc(r.name, 40), { size: 11.5, fill: C.gold });
    if (r.language) body += circle(cols.lang + 4, y + 13.5, 4, languageColor(r.language)) + text(cols.lang + 14, y + 17, trunc(r.language, 20), { size: 11 });
    else body += text(cols.lang, y + 17, '—', { size: 11, fill: C.muted });
    body += text(cols.stars, y + 17, fmt(r.stargazers_count), { size: 11, anchor: 'end' });
    body += text(cols.forks, y + 17, fmt(r.forks_count), { size: 11, anchor: 'end' });
    body += text(cols.size, y + 17, r.size >= 1024 ? `${(r.size / 1024).toFixed(1)} MB` : `${r.size} KB`, { size: 11, anchor: 'end' });
    body += text(cols.upd, y + 17, r.pushed_at.slice(0, 10), { size: 11, anchor: 'end', fill: C.muted });
  });
  body += note(20 + rows.length * 26 + 18, 'Ranked by stars. Per-repository commit counts need authentication, so they are not shown.');
  return { h: 20 + rows.length * 26 + 26, body };
}

// ---------- 9. portfolio ----------

export function portfolio(res: Res<GhRepo[]>): Block {
  if (!res.ok) return message(res.error);
  const rows = rankRepos([...res.v], 'pushed').slice(0, 12);
  if (!rows.length) return message('No public repositories.', false);
  const label = 200;
  const rowH = 22;
  const start = Math.min(...rows.map((r) => new Date(r.created_at).getTime()));
  const end = Date.now();
  const x = (t: number) => label + ((t - start) / Math.max(1, end - start)) * (INNER - label - 10);
  let body = '';
  for (let y = new Date(start).getFullYear() + 1; y <= new Date(end).getFullYear(); y++) {
    const tx = x(new Date(`${y}-01-01`).getTime());
    body += line(tx, 0, tx, rows.length * rowH) + text(tx, rows.length * rowH + 16, y, { size: 9.5, fill: C.muted, anchor: 'middle' });
  }
  rows.forEach((r, i) => {
    const y = i * rowH + rowH / 2;
    const a = x(new Date(r.created_at).getTime());
    const b = Math.max(a + 4, x(new Date(r.pushed_at).getTime()));
    const color = r.archived ? C.grey : C.green;
    body +=
      circle(6, y, 4, r.language ? languageColor(r.language) : C.grey) +
      text(18, y + 4, trunc(r.name, 26), { size: 11 }) +
      `<line x1="${a.toFixed(1)}" y1="${y}" x2="${b.toFixed(1)}" y2="${y}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>` +
      circle(b, y, 3.5, color);
  });
  body += note(rows.length * rowH + 38, 'Each bar runs from creation to last push (a proxy for active period). Grey = archived.');
  return { h: rows.length * rowH + 46, body };
}

// ---------- 11. grade ----------

export function grade(contrib: Res<ContribData>, counts: Res<Counts>, repos: Res<GhRepo[]>): Block {
  if (!contrib.ok || !counts.ok || !repos.ok) return message('Grade needs contributions, counts and repositories; one failed to load.');
  const s = contributionStats(contrib.v.days);
  const g = activityGrade({
    trailingYear: s.trailingYear,
    activeDayPct: s.frequency,
    longestStreak: s.longestStreak,
    prs: counts.v.prs,
    issues: counts.v.issues,
    reviews: counts.v.reviews,
    stars: totalStars(repos.v),
    recentRepos: recentOriginalRepos(repos.v),
  });
  let body =
    text(70, 80, g.grade, { size: 72, weight: 800, fill: C.gold, anchor: 'middle' }) +
    text(70, 102, `${g.score.toFixed(0)} / 100`, { size: 12, fill: C.muted, anchor: 'middle' });
  g.parts.forEach((p, i) => {
    const y = 8 + i * 22;
    body +=
      text(160, y + 9, `${p.label} ×${Math.round(p.weight * 100)}%`, { size: 11 }) +
      rect(360, y, 200, 9, C.card2, 3) +
      rect(360, y, (p.score / 100) * 200, 9, C.green, 3) +
      text(578, y + 9, trunc(p.detail, 52), { size: 10, fill: C.muted });
  });
  body += note(8 + 8 * 22 + 14, `Custom metric, not an official GitHub score. ${GRADE_SCALE.map(([m, l]) => `${l}≥${m}`).join(' ')}. Measures GitHub activity only.`);
  return { h: 8 + 8 * 22 + 22, body };
}

