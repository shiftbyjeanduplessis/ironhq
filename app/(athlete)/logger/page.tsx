// app/(athlete)/logger/page.tsx
// Server component — fetches the athlete's next assigned workout
// and passes it to the interactive Logger client.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LoggerClient from '@/components/logger/LoggerClient'

export default async function LoggerPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check for any unacknowledged required notices
  const { data: pendingNotices } = await supabase
    .from('notices')
    .select(`
      id, title, body, priority, requires_acknowledgement,
      notice_acknowledgements!left(id)
    `)
    .eq('notice_acknowledgements.profile_id', user.id)
    .eq('requires_acknowledgement', true)
    .is('notice_acknowledgements.id', null)
    .limit(1)

  // Fetch today's or next assigned workout
  const today = new Date().toISOString().split('T')[0]
  const { data: nextWorkout } = await supabase
    .from('assigned_workouts')
    .select(`
      id,
      workout_name,
      scheduled_date,
      status,
      assigned_workout_exercises (
        id,
        sort_order,
        planned_sets,
        planned_reps,
        planned_load_value,
        planned_percentage,
        exercises (id, name, category, method)
      )
    `)
    .eq('profile_id', user.id)
    .eq('status', 'assigned')
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .single()

  // Fetch recent completed workouts for the history strip
  const { data: recentLogs } = await supabase
    .from('workout_logs')
    .select('id, manual_workout_title, completed_at, total_volume, assigned_workout_id')
    .eq('profile_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5)

  // Fetch recent PRs
  const { data: recentPRs } = await supabase
    .from('personal_records')
    .select('id, exercise_name_snapshot, pr_type, value, achieved_on')
    .eq('profile_id', user.id)
    .order('achieved_on', { ascending: false })
    .limit(3)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans">
      {/* Header */}
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 justify-between">
        <span className="text-xs font-bold tracking-tighter uppercase text-zinc-100">
          IronHQ
        </span>
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          Logger
        </span>
      </header>

      <LoggerClient
        pendingNotice={pendingNotices?.[0] ?? null}
        nextWorkout={nextWorkout ?? null}
        recentLogs={recentLogs ?? []}
        recentPRs={recentPRs ?? []}
        userId={user.id}
      />
    </div>
  )
}
