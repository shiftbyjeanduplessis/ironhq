// app/(coach)/programs/page.tsx
// Lists all program templates for the active club.
// Coaches can create, edit, and archive programs here.
// Clicking a program opens the full multi-week grid builder.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ProgramsClient from '@/components/programs/ProgramsClient'
import ClubContextSwitcher from '@/components/architect/ClubContextSwitcher'

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: { clubId?: string; programId?: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('club_memberships')
    .select('club_id, role, clubs(id, name)')
    .eq('profile_id', user.id)
    .in('role', ['coach', 'assistant_coach', 'manager'])
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) {
    return (
      <div className="p-8 font-mono text-xs text-red-500 uppercase">
        No active coaching context.
      </div>
    )
  }

  const availableClubs = memberships.map((m) => ({
    id: m.club_id,
    name: (m.clubs as any)?.name ?? 'Unknown',
    role: m.role,
  }))

  const activeClubId =
    searchParams.clubId && availableClubs.some((c) => c.id === searchParams.clubId)
      ? searchParams.clubId
      : availableClubs[0].id

  // Fetch all non-archived program templates for this club
  const { data: programs } = await supabase
    .from('program_templates')
    .select(`
      id, name, total_weeks, default_rounding_increment, is_archived, created_at,
      program_weeks (
        id, week_number, phase_name,
        program_week_slots (
          id, day_index, slot_label,
          workout_template_id
        )
      )
    `)
    .eq('club_id', activeClubId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  // Fetch workout templates available to this club
  const { data: workoutTemplates } = await supabase
    .from('workout_templates')
    .select(`
      id, name,
      workout_template_exercises (
        id, sort_order, planned_sets, planned_reps, planned_load_value,
        exercises (id, name, category, method)
      )
    `)
    .eq('club_id', activeClubId)
    .order('name')

  // Fetch exercises for workout template creation
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, category, method')
    .or(`is_system_default.eq.true,club_id.eq.${activeClubId}`)
    .order('category')
    .order('name')

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-50 flex flex-col font-sans overflow-hidden">
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4">
        <span className="text-xs font-bold tracking-tighter uppercase text-zinc-100">
          IronHQ // Programs
        </span>
        <ClubContextSwitcher activeClubId={activeClubId} clubs={availableClubs} />
      </header>

      <ProgramsClient
        activeClubId={activeClubId}
        coachProfileId={user.id}
        programs={programs ?? []}
        workoutTemplates={workoutTemplates ?? []}
        exercises={exercises ?? []}
        initialProgramId={searchParams.programId ?? null}
      />
    </div>
  )
}
