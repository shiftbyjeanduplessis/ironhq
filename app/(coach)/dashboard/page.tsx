import { MetricCard } from '@/components/metric-card';
import { Shell } from '@/components/shell';
import { TableCard } from '@/components/table-card';
import { athletes, dashboardMetrics, programs } from '@/lib/mock-data';

export default function DashboardPage() {
  return (
    <Shell
      currentPath="/dashboard"
      title="Dashboard"
      subtitle="A deploy-safe shell with the key IronHQ surfaces restored in a controlled way."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <TableCard
          title="Roster needing attention"
          description="Start with the highest-risk athletes instead of bouncing between broken pages."
        >
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Athlete</th>
                <th className="px-5 py-3 font-medium">Sport</th>
                <th className="px-5 py-3 font-medium">Adherence</th>
                <th className="px-5 py-3 font-medium">Next session</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((athlete) => (
                <tr key={athlete.id} className="border-b border-line/60 last:border-b-0">
                  <td className="px-5 py-4 font-medium text-white">{athlete.name}</td>
                  <td className="px-5 py-4 text-slate-300">{athlete.sport}</td>
                  <td className="px-5 py-4 text-slate-300">{athlete.adherence}%</td>
                  <td className="px-5 py-4 text-slate-300">{athlete.nextSession}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <section className="panel p-5">
          <h3 className="text-lg font-semibold">What changed in this rebuild</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>Configs are restored to real config files.</li>
            <li>SQL is moved to the supabase folder instead of root or docs.</li>
            <li>Duplicate stray files are removed from the runtime path.</li>
            <li>The app ships as a stable shell before auth and RPC complexity is reintroduced.</li>
          </ul>

          <div className="mt-6 rounded-2xl border border-line bg-slate-950/25 p-4">
            <p className="text-sm text-slate-400">Programs currently loaded</p>
            <p className="mt-2 text-2xl font-bold">{programs.length}</p>
            <p className="mt-2 text-sm text-slate-300">Enough to validate navigation, cards, and deploy integrity.</p>
          </div>
        </section>
      </section>
    </Shell>
  );
}
