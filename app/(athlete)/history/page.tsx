// app/(athlete)/history/page.tsx
// Athlete's personal history: completed workouts + PRs in a unified timeline.
// Fetches from athlete_history_timeline view.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HistoryPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get(name) { return cookieStore.get(name)?.value } },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: timeline } = await supabase
    .from('athlete_history_timeline')
    .select('*')
    .eq('profile_id', user.id)
    .order('activity_date', { ascending: false })
    .limit(60)

  const { data: allPRs } = await supabase
    .from('personal_records')
    .select('id, exercise_name_snapshot, pr_type, value, achieved_on')
    .eq('profile_id', user.id)
    .order('achieved_on', { ascending: false })

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans">
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 justify-between">
        <span className="text-xs font-bold tracking-tighter uppercase text-zinc-100">
          IronHQ
        </span>
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          History
        </span>
      </header>

      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* PR summary strip */}
        {allPRs && allPRs.length > 0 && (
          <section className="p-4 border-b border-zinc-800">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Personal Records
            </h2>

            {/* Group by exercise */}
            {Object.entries(
              allPRs.reduce<Record<string, typeof allPRs>>((acc, pr) => {
                const key = pr.exercise_name_snapshot
                if (!acc[key]) acc[key] = []
                acc[key].push(pr)
                return acc
              }, {})
            ).map(([exercise, prs]) => (
              <div key={exercise} className="mb-3">
                <p className="text-xs font-bold uppercase tracking-tight text-zinc-300 mb-1">
                  {exercise}
                </p>
                <div className="flex flex-wrap gap-2">
                  {prs.map((pr) => (
                    <div
                      key={pr.id}
                      className="border border-zinc-800 bg-zinc-900 px-3 py-1.5 flex items-center gap-2"
                    >
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">
                        {pr.pr_type}
                      </span>
                      <span className="text-sm font-bold font-mono text-white">
                        {pr.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Activity timeline */}
        <section className="p-4">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Timeline
          </h2>

          {!timeline || timeline.length === 0 ? (
            <div className="border border-dashed border-zinc-800 p-8 text-center">
              <p className="text-xs font-mono text-zinc-600 uppercase">
                No activity yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeline.map((entry: any) => (
                <div
                  key={entry.id}
                  className={`
                    border px-4 py-3 flex items-center justify-between
                    ${
                      entry.type === 'pr'
                        ? 'border-yellow-900 bg-yellow-950/10'
                        : 'border-zinc-800 bg-zinc-900/50'
                    }
                  `}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {entry.type === 'pr' && (
                        <span className="text-[9px] font-mono text-yellow-500 uppercase tracking-widest shrink-0">
                          PR
                        </span>
                      )}
                      <p className="text-xs font-medium text-zinc-200 truncate">
                        {entry.title}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                      {entry.activity_date
                        ? new Date(entry.activity_date).toLocaleDateString('en-ZA', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })
                        : '—'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {entry.type === 'workout' && entry.total_volume ? (
                      <span className="text-[10px] font-mono text-zinc-500">
                        {Number(entry.total_volume).toLocaleString()} vol
                      </span>
                    ) : null}
                    {entry.type === 'pr' && entry.pr_value ? (
                      <span className="text-sm font-bold font-mono text-yellow-400">
                        {entry.pr_value}
                        {entry.pr_type && (
                          <span className="text-[9px] text-yellow-600 ml-1">
                            {entry.pr_type}
                          </span>
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
