import { Shell } from '@/components/shell';

const days = [
  {
    label: 'Monday',
    title: 'Comp Squat + Bench',
    notes: 'Top single at RPE 8, then 4 x 4 backoff. Secondary bench volume.',
  },
  {
    label: 'Wednesday',
    title: 'Deadlift Pull',
    notes: 'Variation deadlift, hamstring accessory block, trunk work.',
  },
  {
    label: 'Friday',
    title: 'Bench Volume',
    notes: 'Main bench 5 x 5, upper back accessories, shoulder health finisher.',
  },
];

export default function BuilderPage() {
  return (
    <Shell
      currentPath="/builder"
      title="Builder"
      subtitle="This page is a controlled placeholder for your next phase program builder, without drag-and-drop instability."
    >
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="panel p-5">
          <h3 className="text-lg font-semibold">Rebuild plan</h3>
          <ol className="mt-4 space-y-3 text-sm text-slate-300">
            <li>Ship static builder shell.</li>
            <li>Introduce form state for one template at a time.</li>
            <li>Add save validation locally.</li>
            <li>Wire one RPC only after the UI state is stable.</li>
            <li>Add drag-and-drop last, not first.</li>
          </ol>
        </article>

        <article className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Template</p>
              <h3 className="text-xl font-semibold">12 Week Meet Prep</h3>
            </div>
            <span className="badge">Week 1 preview</span>
          </div>

          <div className="mt-5 space-y-4">
            {days.map((day) => (
              <div key={day.label} className="rounded-2xl border border-line bg-slate-950/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{day.label}</p>
                    <h4 className="text-lg font-semibold">{day.title}</h4>
                  </div>
                  <button className="rounded-xl border border-line px-3 py-2 text-sm text-slate-300">
                    Edit later
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-300">{day.notes}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </Shell>
  );
}
