import { ProgramCard } from '@/components/program-card';
import { Shell } from '@/components/shell';
import { programs } from '@/lib/mock-data';

export default function ProgramsPage() {
  return (
    <Shell
      currentPath="/programs"
      title="Programs"
      subtitle="A simplified program library replacing the unstable RPC-heavy prototype surface."
    >
      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {programs.map((program) => (
          <ProgramCard key={program.id} program={program} />
        ))}
      </section>
    </Shell>
  );
}
