// app/(coach)/architect/page.tsx
// Server component — runs on the server, respects RLS via cookie session.
// Fetches multi-club context, scoped exercises, and club athletes.
// Club context is resolved from the URL searchParam ?clubId=

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ArchitectClient from '@/components/architect/ArchitectClient'
import ClubContextSwitcher from '@/components/architect/ClubContextSwitcher'

export default async function ArchitectPage({
  searchParams,
}: {
  searchParams: { clubId?: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch all active coach/manager/assistant_coach memberships
  const { data: memberships, error: membershipError } = await supabase
    .from('club_memberships')
    .select('club_id, role, clubs(id, name, slug)')
    .eq('profile_id', user.id)
    .in('role', ['coach', 'assistant_coach', 'manager'])
    .eq('status', 'active')

  if (membershipError || !memberships || memberships.length === 0) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <p className="font-mono text-xs text-red-500 uppercase tracking-widest">
          ERROR: No active coaching context found. Contact your administrator.
        </p>
      </div>
    )
  }

  // Resolve active club from URL param or first available
  const availableClubs = memberships.map((m) => ({
    id: m.club_id,
    name: (m.clubs as any)?.name ?? 'Unknown Club',
    role: m.role,
  }))

  const activeClubId =
    searchParams.clubId &&
    availableClubs.some((c) => c.id === searchParams.clubId)
      ? searchParams.clubId
      : availableClubs[0].id

  const activeClub = availableClubs.find((c) => c.id === activeClubId)!

  // Fetch exercises scoped to system defaults + active club
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, name, category, method')
    .or(`is_system_default.eq.true,club_id.eq.${activeClubId}`)
    .order('category')
    .order('name')

  // Fetch athletes in the active club
  const { data: rosterRows } = await supabase
    .from('club_memberships')
    .select('profiles(id, display_name, email)')
    .eq('club_id', activeClubId)
    .eq('role', 'athlete')
    .eq('status', 'active')

  const athletes =
    rosterRows
      ?.map((r) => r.profiles)
      .filter(Boolean)
      .sort((a: any, b: any) =>
        (a.display_name ?? '').localeCompare(b.display_name ?? '')
      ) ?? []

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-50 overflow-hidden flex flex-col font-sans">
      {/* Header */}
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4">
        <span className="text-xs font-bold tracking-tighter uppercase text-zinc-100">
          IronHQ // The Architect
        </span>
        <ClubContextSwitcher
          activeClubId={activeClubId}
          clubs={availableClubs}
        />
      </header>

      <ArchitectClient
        initialExercises={exercises ?? []}
        athletes={athletes as any}
        activeClubId={activeClubId}
        activeClubName={activeClub.name}
      />
    </div>
  )
}
