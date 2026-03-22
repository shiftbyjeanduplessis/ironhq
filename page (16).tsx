// app/(admin)/admin/page.tsx
// Platform overview — aggregate stats across all clubs.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminOverviewPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_role')
    .eq('id', user.id)
    .single()

  if (profile?.primary_role !== 'admin') redirect('/architect')

  const { data: stats } = await supabase.rpc('admin_platform_stats')
  const s = stats?.[0]

  const STAT_CARDS = [
    { label: 'Active Clubs',        value: s?.active_clubs     ?? 0, sub: `${s?.total_clubs ?? 0} total`         },
    { label: 'Active Athletes',     value: s?.total_athletes   ?? 0, sub: 'across all clubs'                     },
    { label: 'Active Coaches',      value: s?.total_coaches    ?? 0, sub: 'coaches + managers'                   },
    { label: 'Completed Workouts',  value: s?.completed_logs   ?? 0, sub: `${s?.total_workout_logs ?? 0} total`  },
    { label: 'Personal Records',    value: s?.total_prs        ?? 0, sub: 'all time'                             },
    { label: 'Logs (7 days)',       value: s?.logs_last_7_days ?? 0, sub: `${s?.logs_last_30_days ?? 0} in 30d`  },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 py-4 border-b border-zinc-800 bg-zinc-950">
        <h1 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
          Platform Overview
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {STAT_CARDS.map(({ label, value, sub }) => (
            <div key={label} className="border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                {label}
              </p>
              <p className="text-2xl font-bold text-white font-mono">
                {Number(value).toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        <div className="border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">
            Quick Actions
          </p>
          <div className="flex gap-3">
            <a
              href="/admin/clubs"
              className="
                text-[10px] font-mono uppercase tracking-widest
                border border-zinc-700 text-zinc-400 px-3 py-2
                hover:border-white hover:text-white transition-colors
              "
            >
              Manage Clubs →
            </a>
            <a
              href="/admin/profiles"
              className="
                text-[10px] font-mono uppercase tracking-widest
                border border-zinc-700 text-zinc-400 px-3 py-2
                hover:border-white hover:text-white transition-colors
              "
            >
              Manage Profiles →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
