// app/(coach)/comms/page.tsx
// Coach comms hub — noticeboard + messaging.
// Server component fetches notices and conversations.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CommsClient from '@/components/comms/CommsClient'
import ClubContextSwitcher from '@/components/architect/ClubContextSwitcher'

export default async function CommsPage({
  searchParams,
}: {
  searchParams: { clubId?: string; tab?: string }
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

  // Fetch notices for this club
  const { data: notices } = await supabase
    .from('notices')
    .select(`
      id, title, body, priority, requires_acknowledgement, published_at,
      created_by_profile_id,
      notice_acknowledgements(id, profile_id, acknowledged_at)
    `)
    .eq('club_id', activeClubId)
    .order('published_at', { ascending: false })

  // Fetch athlete count for acknowledgement context
  const { count: athleteCount } = await supabase
    .from('club_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', activeClubId)
    .eq('role', 'athlete')
    .eq('status', 'active')

  // Fetch conversations for this club where coach is a participant
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id, conversation_type,
      conversation_participants(
        profile_id,
        profiles(id, display_name, email)
      ),
      messages(id, body, created_at, sender_profile_id)
    `)
    .eq('club_id', activeClubId)
    .order('id')

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-50 flex flex-col font-sans overflow-hidden">
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4">
        <span className="text-xs font-bold tracking-tighter uppercase text-zinc-100">
          IronHQ // Comms
        </span>
        <ClubContextSwitcher activeClubId={activeClubId} clubs={availableClubs} />
      </header>

      <CommsClient
        activeClubId={activeClubId}
        coachProfileId={user.id}
        notices={notices ?? []}
        athleteCount={athleteCount ?? 0}
        conversations={conversations ?? []}
        activeTab={(searchParams.tab as 'notices' | 'messages') ?? 'notices'}
      />
    </div>
  )
}
