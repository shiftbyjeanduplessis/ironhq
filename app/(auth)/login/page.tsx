import Link from 'next/link';
import { ShieldCheck, Dumbbell, Users, LineChart } from 'lucide-react';

const features = [
  {
    icon: Dumbbell,
    title: 'Program builder',
    description: 'Plan week-by-week training blocks without spreadsheet chaos.',
  },
  {
    icon: Users,
    title: 'Roster control',
    description: 'Track athletes, clubs, and visibility rules from one shell.',
  },
  {
    icon: LineChart,
    title: 'Execution tracking',
    description: 'Log sessions, capture PRs, and review adherence quickly.',
  },
  {
    icon: ShieldCheck,
    title: 'Deploy-safe foundation',
    description: 'This rebuild prioritizes clean structure and predictable deploys.',
  },
];

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center">
      <section className="max-w-2xl">
        <span className="badge">Clean rebuild</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          IronHQ, rebuilt on a stable Next.js foundation.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-300">
          This version removes the repo corruption, duplicate files, and mixed SQL/code state that broke deployment.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="panel p-5">
                <Icon className="h-5 w-5 text-brand" />
                <h2 className="mt-3 text-lg font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel w-full max-w-md p-6">
        <h2 className="text-2xl font-semibold">Entry point</h2>
        <p className="mt-2 text-sm text-slate-300">
          Authentication is intentionally stubbed for the fresh-start build so the app deploys first.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block text-slate-300">Email</span>
            <input
              className="w-full rounded-xl border border-line bg-slate-950/50 px-4 py-3 outline-none ring-0"
              placeholder="coach@ironhq.app"
              disabled
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-slate-300">Password</span>
            <input
              className="w-full rounded-xl border border-line bg-slate-950/50 px-4 py-3 outline-none ring-0"
              placeholder="••••••••"
              disabled
            />
          </label>
        </div>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 font-semibold text-slate-950 transition hover:opacity-90"
        >
          Enter demo shell
        </Link>

        <p className="mt-4 text-xs text-slate-400">
          Next step after deployment: wire this screen to Supabase auth and re-enable route protection.
        </p>
      </section>
    </main>
  );
}
