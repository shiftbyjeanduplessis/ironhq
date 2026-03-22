// app/(coach)/roster/page.tsx
// Server component.
// Fetches compliance data from coach_roster_compliance view.
// Scoped to the active club via URL param.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RosterClient from '@/components/roster/RosterClient'
import ClubContextSwitcher from '@/components/architect/ClubContextSwitcher'

export default async function RosterPage({
  searchParams,
}: {
  searchParams: { clubId?: string }
}) {
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

  // Get coach's active clubs
  const { data: memberships } = await supabase
    .from('club_memberships')
    .select('club_id, role, clubs(id, name)')
    .eq('profile_id', user.id)
    .in('role', ['coach', 'assistant_coach', 'manager'])
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) {
    return (
      <div className="p-8 font-mono text-xs text-red-500 uppercase">
        No active coaching context found.
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

  // Fetch roster compliance for active club
  const { data: roster } = await supabase
    .from('coach_roster_compliance')
    .select('*')
    .eq('club_id', activeClubId)
    .order('athlete_name', { ascending: true })

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-50 flex flex-col font-sans overflow-hidden">
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4">
        <span className="text-xs font-bold tracking-tighter uppercase text-zinc-100">
          IronHQ // Roster
        </span>
        <ClubContextSwitcher activeClubId={activeClubId} clubs={availableClubs} />
      </header>

      <RosterClient
        roster={roster ?? []}
        activeClubId={activeClubId}
      />
    </div>
  )
}
