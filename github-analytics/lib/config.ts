export const USERNAME = process.env.NEXT_PUBLIC_GITHUB_USERNAME || 'anikchand461';

/** Set NEXT_PUBLIC_SHOW_GRADE=false to hide the custom activity grade. */
export const SHOW_GRADE = process.env.NEXT_PUBLIC_SHOW_GRADE !== 'false';

/** Number of repositories to fetch per-repo language bytes for (each is one API call). */
export const LANGUAGE_REPO_LIMIT = 12;
