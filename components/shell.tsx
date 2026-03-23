import Link from 'next/link';
import { BarChart3, ClipboardList, Dumbbell, Home, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/roster', label: 'Roster', icon: Users },
  { href: '/programs', label: 'Programs', icon: ClipboardList },
  { href: '/builder', label: 'Builder', icon: Dumbbell },
];

export function Shell({
  title,
  subtitle,
  currentPath,
  children,
}: {
  title: string;
  subtitle: string;
  currentPath: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[260px_1fr] lg:px-6">
        <aside className="panel p-4">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="rounded-2xl bg-brand/20 p-3 text-brand">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Coach workspace</p>
              <h1 className="text-xl font-semibold">IronHQ</h1>
            </div>
          </div>

          <nav className="mt-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition',
                    isActive
                      ? 'bg-brand text-slate-950'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-line bg-slate-950/30 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fresh start rule</p>
            <p className="mt-2 text-sm text-slate-300">
              Keep app code, SQL, and docs in separate folders. Never paste migrations into config files.
            </p>
          </div>
        </aside>

        <main className="space-y-6">
          <header className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Stable rebuild</p>
              <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p>
            </div>
            <div className="rounded-2xl border border-line bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
              Club context: <span className="font-semibold text-white">Demo Performance Club</span>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
