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
  languageShares,
  monthTotals,
  punchCard,
  rankRepos,
  recentOriginalRepos,
  rollingYear,
  totalStars,
  weekdayTotals,
  weekendShare,
  yearGrid,
  yearsOf,
} from '../analytics';
import type { ContribData, Counts, GhRepo, GhUser, LanguageBytes, PushSample, YearComposition } from '../types';
import { Block, C, HEAT, INNER, circle, group, line, message, meta, note, rect, text, tile, treemap, trunc } from './kit';

export type Res<T> = { ok: true; v: T } | { ok: false; error: string };

const val = <T,>(r: Res<T>, get: (v: T) => number) => (r.ok ? fmt(get(r.v)) : '—');

// ---------- 1. overview ----------

export function overview(user: Res<GhUser>, repos: Res<GhRepo[]>, contrib: Res<ContribData>, counts: Res<Counts>): Block {
  const gap = 10;
  const w = (INNER - gap * 3) / 4;
  const h = 72;
  const since = contrib.ok && contrib.v.days.length ? `Since ${contrib.v.days[0].date.slice(0, 4)}` : undefined;
  const tiles: [string, string, string?, boolean?][] = [
    ['Contributions (all time)', val(contrib, (c) => c.days.reduce((s, d) => s + d.count, 0)), since, true],
    ['Commits (public)', val(counts, (c) => c.commits), 'Default branches', true],
    ['Stars earned', val(repos, totalStars), 'Forks excluded'],
    ['Public repositories', val(user, (u) => u.public_repos)],
    ['Pull requests', val(counts, (c) => c.prs)],
    ['Issues opened', val(counts, (c) => c.issues)],
    ['Code reviews', val(counts, (c) => c.reviews), "On others' PRs"],
    ['Followers', val(user, (u) => u.followers), user.ok ? `Following ${fmt(user.v.following)}` : undefined],
  ];
  const body = tiles.map(([l, v, s, g], i) => tile((i % 4) * (w + gap), Math.floor(i / 4) * (h + gap), w, h, l, v, s, g)).join('');
  return { h: h * 2 + gap, body };
}

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

// ---------- 5. composition ----------

export function composition(res: Res<YearComposition[]>): Block {
  if (!res.ok) return message(`Unavailable: ${res.error}`);
  const rows = res.v;
  if (!rows.length) return message('No data to show yet.', false);
  const series: [keyof YearComposition, string, string][] = [
    ['other', 'Commits & other (calculated)', C.grey],
    ['issues', 'Issues', C.gold],
    ['prs', 'Pull requests', C.purple],
    ['reviews', 'Reviews', C.green],
  ];
  const ch = 150;
  const top = 18;
  const chartW = 560;
  const max = Math.max(...rows.map((r) => r.total), 1);
  const slot = chartW / rows.length;
  const bw = Math.min(64, slot - 16);
  let body = line(0, top + ch, chartW, top + ch);
  rows.forEach((r, i) => {
    const x = i * slot + (slot - bw) / 2;
    let y = top + ch;
    for (const [key, , color] of series) {
      const h = ((r[key] as number) / max) * ch;
      body += rect(x, y - h, bw, h, color, 1);
      y -= h;
    }
    body += text(x + bw / 2, y - 6, fmt(r.total), { size: 10, fill: C.muted, anchor: 'middle' });
    body += text(x + bw / 2, top + ch + 16, r.year, { size: 10, fill: C.muted, anchor: 'middle' });
  });
  series.forEach(([, label, color], i) => {
    body += rect(600, 22 + i * 22, 10, 10, color, 2) + text(618, 31 + i * 22, label, { size: 10.5 });
  });
  body +=
    text(600, 128, 'Measured: pull requests, issues, reviews', { size: 9.5, fill: C.muted }) +
    text(600, 142, '(GitHub search, by creation date).', { size: 9.5, fill: C.muted }) +
    text(600, 160, 'Calculated: commits & other = yearly', { size: 9.5, fill: C.muted }) +
    text(600, 174, 'total minus the three measured types.', { size: 9.5, fill: C.muted });
  return { h: top + ch + 30, body };
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

// ---------- 7. commit cadence ----------

export function cadence(res: Res<PushSample[]>): Block {
  if (!res.ok) return message(res.error);
  if (!res.v.length) return message('No public pushes in the last 90 days.', false);
  const grid = punchCard(res.v);
  const max = Math.max(...grid.flat(), 1);
  const left = 40;
  const step = (INNER - left) / 24;
  const row = 26;
  let body = '';
  [1, 2, 3, 4, 5, 6, 0].forEach((d, r) => {
    body += text(0, r * row + row / 2 + 4, WEEKDAYS[d], { size: 10, fill: C.muted });
    for (let h = 0; h < 24; h++) {
      const v = grid[d][h];
      body += circle(left + h * step + step / 2, r * row + row / 2, v ? 3 + (v / max) * 9 : 1.6, v ? C.green : C.border, v ? 0.5 + (v / max) * 0.5 : 1);
    }
  });
  for (let h = 0; h < 24; h += 3) body += text(left + h * step + step / 2, 7 * row + 14, String(h), { size: 9.5, fill: C.muted, anchor: 'middle' });
  const total = res.v.reduce((a, s) => a + s.commits, 0);
  const byHour = Array.from({ length: 24 }, (_, h) => grid.reduce((a, r) => a + r[h], 0));
  body += note(7 * row + 36, `Commit activity only (public pushes, ~last 90 days, UTC): ${fmt(total)} commits in ${fmt(res.v.length)} pushes. Busiest hour ${byHour.indexOf(Math.max(...byHour))}:00.`);
  return { h: 7 * row + 44, body };
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

// ---------- 10. languages ----------

export function languages(repos: Res<GhRepo[]>, bytes: Res<LanguageBytes>): Block {
  if (!repos.ok) return message(repos.error);
  const { unit, rows } = languageShares(bytes.ok ? bytes.v : null, repos.v);
  if (!rows.length) return message('No language data.', false);
  const th = 180;
  const cells = treemap(rows.slice(0, 12), INNER, th);
  let body = '';
  for (const c of cells) {
    const p = (c.value / rows.reduce((a, r) => a + r.value, 0)) * 100;
    body += rect(c.x + 1, c.y + 1, c.w - 2, c.h - 2, languageColor(c.name), 4);
    if (c.w > 70 && c.h > 36) {
      body += text(c.x + 9, c.y + 19, trunc(c.name, Math.floor(c.w / 7.5)), { size: 12, weight: 700, fill: C.bg });
      body += text(c.x + 9, c.y + 34, `${p.toFixed(1)}%`, { size: 11, fill: C.bg });
    }
  }
  const list = rows.slice(0, 6);
  list.forEach((r, i) => {
    const col = i % 2;
    const y = th + 18 + Math.floor(i / 2) * 22;
    const x0 = col * (INNER / 2 + 10);
    const bw = INNER / 2 - 200;
    body +=
      circle(x0 + 4, y + 4, 4, languageColor(r.name)) +
      text(x0 + 14, y + 8, trunc(r.name, 16), { size: 11 }) +
      rect(x0 + 140, y, bw, 8, C.card2, 3) +
      rect(x0 + 140, y, (r.percent / 100) * bw, 8, languageColor(r.name), 3) +
      text(x0 + 140 + bw + 46, y + 8, `${r.percent.toFixed(1)}%`, { size: 10.5, anchor: 'end', fill: C.muted });
  });
  body += note(th + 18 + 3 * 22 + 8, unit === 'bytes' ? 'Measured in bytes across the largest original public repositories.' : 'Byte counts unavailable; showing repository count by primary language.');
  return { h: th + 18 + 3 * 22 + 16, body };
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

export { group };
