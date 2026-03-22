// app/(coach)/settings/page.tsx
// Club settings — visibility, branding, general.
// Server component fetches current club settings.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ClubSettingsClient from '@/components/settings/ClubSettingsClient'
import ClubContextSwitcher from '@/components/architect/ClubContextSwitcher'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { clubId?: string }
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
    .select('club_id, role, clubs(id, name, slug, default_athlete_visibility, squad_board_enabled, squad_pr_feed_enabled, squad_compliance_visible, athlete_self_compliance, default_weight_unit, sport, default_rounding_increment)')
    .eq('profile_id', user.id)
    .in('role', ['coach', 'assistant_coach', 'manager'])
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) redirect('/architect')

  const availableClubs = memberships.map((m) => ({
    id: m.club_id,
    name: (m.clubs as any)?.name ?? 'Unknown',
    role: m.role,
  }))

  const activeClubId =
    searchParams.clubId && availableClubs.some((c) => c.id === searchParams.clubId)
      ? searchParams.clubId
      : availableClubs[0].id

  const activeClubData = (memberships.find((m) => m.club_id === activeClubId)?.clubs as any) ?? {}

  const { data: branding } = await supabase
    .from('club_branding')
    .select('logo_url, accent_color, theme_preset')
    .eq('club_id', activeClubId)
    .single()

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-50 flex flex-col font-sans overflow-hidden">
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4">
        <span className="text-xs font-bold tracking-tighter uppercase text-zinc-100">
          IronHQ // Club Settings
        </span>
        <ClubContextSwitcher activeClubId={activeClubId} clubs={availableClubs} />
      </header>
      <ClubSettingsClient
        activeClubId={activeClubId}
        clubData={activeClubData}
        branding={branding ?? {}}
      />
    </div>
  )
}
