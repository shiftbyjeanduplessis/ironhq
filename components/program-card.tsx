import type { ProgramTemplate } from '@/lib/types';

export function ProgramCard({ program }: { program: ProgramTemplate }) {
  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{program.phase}</p>
          <h3 className="text-xl font-semibold">{program.name}</h3>
        </div>
        <span className="badge">{program.weeks} weeks</span>
      </div>
      <p className="mt-3 text-sm text-slate-300">
        Assigned athletes: <span className="font-semibold text-white">{program.athletesAssigned}</span>
      </p>

      <div className="mt-4 space-y-3">
        {program.slots.map((slot) => (
          <div key={`${program.id}-${slot.day}`} className="rounded-2xl border border-line bg-slate-950/25 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{slot.day}</span>
              <span className="text-sm text-slate-400">{slot.title}</span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{slot.focus}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
