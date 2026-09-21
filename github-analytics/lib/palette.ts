/** Shared by the React dashboard and the SVG README image. Background stays GitHub's #0d1117. */
export const BG = '#0d1117';

export const P = {
  blue: '#58a6ff',
  cyan: '#56d4dd',
  purple: '#a371f7',
  pink: '#f778ba',
  orange: '#ffa657',
  gold: '#f0c040',
  green: '#39d353',
  red: '#ff7b72',
};

/** Weekday colors, Sunday first. */
export const WEEKDAY_COLORS = [P.pink, P.blue, P.cyan, P.green, P.gold, P.orange, P.purple];

/** Month colors, January first (a smooth loop around the wheel). */
export const MONTH_COLORS = [
  '#58a6ff', '#56d4dd', '#3fb9a0', '#39d353', '#9be36a', '#f0c040',
  '#ffa657', '#ff7b72', '#f778ba', '#c084fc', '#a371f7', '#7c8cff',
];

/** Five-step heatmap ramps (empty → most active), one per year, cycling newest first. */
export const HEAT_RAMPS: string[][] = [
  ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'], // green
  ['#161b22', '#0c2d6b', '#1158c7', '#388bfd', '#79c0ff'], // blue
  ['#161b22', '#3b1d6e', '#6e40c9', '#a371f7', '#d2a8ff'], // purple
  ['#161b22', '#5a3a0b', '#9e6a03', '#d29922', '#f0c040'], // gold
];

/** Metric colors for the stat list. */
export const STAT_COLORS = {
  stars: P.gold,
  commits: P.blue,
  prs: P.purple,
  issues: P.orange,
  contributed: P.pink,
};
