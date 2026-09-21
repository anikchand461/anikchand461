import { USERNAME } from '@/lib/config';
import { renderDashboardSvg } from '@/lib/svg/render';

export const maxDuration = 30;

/**
 * README image. GitHub can't run React, so this renders the same data as /dashboard into one static SVG.
 * Healthy renders are cached at the edge for 6h; partial renders (some source failed) only for 5 min so they heal quickly.
 */
export async function GET() {
  const { svg, degraded } = await renderDashboardSvg(USERNAME);
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': degraded
        ? 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
        : 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
}
