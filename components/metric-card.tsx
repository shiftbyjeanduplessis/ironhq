import type { DashboardMetric } from '@/lib/types';

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <div className="metric">
      <p className="text-sm text-slate-400">{metric.label}</p>
      <p className="mt-2 text-3xl font-bold">{metric.value}</p>
      <p className="mt-2 text-sm text-slate-300">{metric.helper}</p>
    </div>
  );
}
