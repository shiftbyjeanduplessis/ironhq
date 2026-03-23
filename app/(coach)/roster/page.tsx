import { Shell } from '@/components/shell';
import { TableCard } from '@/components/table-card';
import { athletes } from '@/lib/mock-data';

export default function RosterPage() {
  return (
    <Shell
      currentPath="/roster"
      title="Roster"
      subtitle="A clean roster surface that can later be wired to Supabase queries and visibility controls."
    >
      <TableCard
        title="Athletes"
        description="This table is intentionally simple so you can reintroduce permissions and filters without hidden complexity."
      >
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Sport</th>
              <th className="px-5 py-3 font-medium">Coach</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Adherence</th>
              <th className="px-5 py-3 font-medium">Next session</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete) => (
              <tr key={athlete.id} className="border-b border-line/60 last:border-b-0">
                <td className="px-5 py-4 font-medium text-white">{athlete.name}</td>
                <td className="px-5 py-4 text-slate-300">{athlete.sport}</td>
                <td className="px-5 py-4 text-slate-300">{athlete.coach}</td>
                <td className="px-5 py-4">
                  <span className="badge">{athlete.status}</span>
                </td>
                <td className="px-5 py-4 text-slate-300">{athlete.adherence}%</td>
                <td className="px-5 py-4 text-slate-300">{athlete.nextSession}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </Shell>
  );
}
