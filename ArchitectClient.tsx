'use client'
// components/admin/AdminClubsClient.tsx

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Building2 } from 'lucide-react'

type Club = {
  club_id: string
  club_name: string
  club_slug: string
  is_active: boolean
  athlete_count: number
  coach_count: number
  total_members: number
  created_at: string
}

export default function AdminClubsClient({ clubs: initial }: { clubs: Club[] }) {
  const [clubs, setClubs] = useState<Club[]>(initial)
  const [toggling, setToggling] = useState<string | null>(null)
  const supabase = createClient()

  const handleToggle = async (clubId: string, currentActive: boolean) => {
    setToggling(clubId)
    const { error } = await supabase.rpc('admin_toggle_club', {
      p_club_id: clubId,
      p_active: !currentActive,
    })
    if (error) { alert(error.message); setToggling(null); return }
    setClubs((prev) =>
      prev.map((c) => c.club_id === clubId ? { ...c, is_active: !currentActive } : c)
    )
    setToggling(null)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="grid grid-cols-12 px-6 py-2 border-b border-zinc-900 bg-zinc-900 gap-4">
        {['Club', 'Slug', 'Athletes', 'Coaches', 'Created', 'Status'].map((h) => (
          <div key={h} className={`text-[10px] text-zinc-600 uppercase tracking-widest ${h === 'Club' ? 'col-span-3' : h === 'Slug' ? 'col-span-2' : 'col-span-1'} ${h === 'Status' ? 'col-span-2' : ''}`}>
            {h}
          </div>
        ))}
      </div>

      <div className="divide-y divide-zinc-900">
        {clubs.map((club) => (
          <div key={club.club_id} className="grid grid-cols-12 px-6 py-3 gap-4 items-center hover:bg-zinc-900/30 transition-colors">
            <div className="col-span-3 flex items-center gap-2 min-w-0">
              <Building2 size={12} className="text-zinc-600 shrink-0" />
              <span className="text-xs text-zinc-200 truncate">{club.club_name}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-mono text-zinc-500">{club.club_slug}</span>
            </div>
            <div className="col-span-1">
              <span className="text-[10px] font-mono text-zinc-400">{club.athlete_count}</span>
            </div>
            <div className="col-span-1">
              <span className="text-[10px] font-mono text-zinc-400">{club.coach_count}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-mono text-zinc-600">
                {new Date(club.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="col-span-3 flex items-center gap-3">
              <span className={`text-[10px] font-mono uppercase ${club.is_active ? 'text-green-500' : 'text-red-500'}`}>
                {club.is_active ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => handleToggle(club.club_id, club.is_active)}
                disabled={toggling === club.club_id}
                className="
                  text-[10px] font-mono uppercase tracking-widest
                  border border-zinc-700 text-zinc-500 px-2 py-1
                  hover:border-zinc-500 hover:text-zinc-300
                  disabled:opacity-40 transition-colors
                "
              >
                {toggling === club.club_id ? '...' : club.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
