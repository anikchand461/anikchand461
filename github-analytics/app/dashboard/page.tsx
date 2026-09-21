import { Dashboard } from '@/components/Dashboard';

// Regenerate at most every 6 hours (must be a literal; keep in sync with REVALIDATE_SECONDS in lib/config.ts).
export const revalidate = 21600;

export default function DashboardPage() {
  return <Dashboard />;
}
