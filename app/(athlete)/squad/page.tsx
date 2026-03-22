// app/(athlete)/squad/page.tsx
// Squad board — only visible if coach has enabled it for the club.
// Shows teammates based on each athlete's visibility setting.
// Server component fetches via get_squad_board RPC.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

type SquadMember = {
  profile_id: string
  display_name: string
  visibility: string
  program_name: string | null
  workouts_done: number
  compliance: number | null
  top_e1rm: number | null
  top_exercise: string | null
}

export default async function SquadPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get athlete's active club
  const { data: membership } = await supabase
    .from('club_memberships')
    .select('club_id, clubs(name, squad_board_enabled)')
    .eq('profile_id', user.id)
    .eq('role', 'athlete')
    .eq('status', 'active')
    .order('joined_at', { ascending: false })
    .limit(1)
    .single()

  const clubData = membership?.clubs as any
  if (!clubData?.squad_board_enabled) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
            Squad board not enabled
          </p>
          <p className="text-[10px] font-mono text-zinc-700 mt-2">
            Your coach hasn't enabled the squad board for this club yet.
          </p>
        </div>
      </div>
    )
  }

  const { data: squad, error } = await supabase
    .rpc('get_squad_board', { p_club_id: membership!.club_id })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-4 py-3 border-b border-zinc-800">
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          {clubData.name}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error ? (
          <p className="text-[10px] font-mono text-red-500 uppercase">{error.message}</p>
        ) : !squad || squad.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-xs font-mono text-zinc-600 uppercase">No squad members yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(squad as SquadMember[]).map((member) => (
              <SquadCard key={member.profile_id} member={member} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SquadCard({ member }: { member: SquadMember }) {
  const initials = (member.display_name ?? 'XX')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold font-mono text-zinc-300 flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-tight text-zinc-100 truncate">
            {member.display_name}
          </p>
          <p className="text-[9px] font-mono text-zinc-600 truncate mt-0.5">
            {member.program_name ?? 'No program'}
          </p>
        </div>
      </div>

      {/* Stats — based on visibility */}
      {member.visibility === 'name_only' ? (
        <div className="px-3 py-3 text-center text-[9px] font-mono text-zinc-700 uppercase tracking-wider">
          Stats private
        </div>
      ) : (
        <div className="grid grid-cols-3 divide-x divide-zinc-800">
          <StatCell label="Done" value={member.workouts_done ?? 0} />
          <StatCell
            label="Rate"
            value={member.compliance !== null ? `${member.compliance}%` : '—'}
            highlight={member.compliance !== null && member.compliance >= 80}
          />
          <StatCell
            label="e1RM"
            value={member.visibility === 'full_stats' && member.top_e1rm ? member.top_e1rm : '—'}
            highlight={member.visibility === 'full_stats' && !!member.top_e1rm}
          />
        </div>
      )}
    </div>
  )
}

function StatCell({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div className="py-2 px-1 text-center">
      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-bold font-mono mt-0.5 ${highlight ? 'text-amber-400' : 'text-zinc-300'}`}>
        {value}
      </p>
    </div>
  )
}
