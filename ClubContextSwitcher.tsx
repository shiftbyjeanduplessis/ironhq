'use client'
// components/admin/AdminProfilesClient.tsx

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  profile_id: string
  email: string
  display_name: string | null
  primary_role: string
  is_active: boolean
  club_count: number
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  athlete: 'text-blue-400',
  coach:   'text-green-400',
  admin:   'text-red-400',
}

export default function AdminProfilesClient({ profiles: initial }: { profiles: Profile[] }) {
  const [profiles, setProfiles] = useState<Profile[]>(initial)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const supabase = createClient()

  const filtered = profiles.filter((p) =>
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.display_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleToggle = async (profileId: string, currentActive: boolean) => {
    setToggling(profileId)
    const { error } = await supabase.rpc('admin_toggle_profile', {
      p_profile_id: profileId,
      p_active: !currentActive,
    })
    if (error) { alert(error.message); setToggling(null); return }
    setProfiles((prev) =>
      prev.map((p) => p.profile_id === profileId ? { ...p, is_active: !currentActive } : p)
    )
    setToggling(null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="shrink-0 px-6 py-3 border-b border-zinc-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="
            w-full max-w-sm bg-zinc-900 border border-zinc-800
            text-xs text-zinc-100 font-mono p-2
            focus:outline-none focus:border-zinc-600 transition-colors
            placeholder:text-zinc-600
          "
        />
      </div>

      {/* Header */}
      <div className="shrink-0 grid grid-cols-12 px-6 py-2 border-b border-zinc-900 bg-zinc-900 gap-4">
        {['Email', 'Name', 'Role', 'Clubs', 'Joined', 'Status'].map((h, i) => (
          <div key={h} className={`text-[10px] text-zinc-600 uppercase tracking-widest ${[3,2,1,1,2,3][i] === 3 ? 'col-span-3' : [3,2,1,1,2,3][i] === 2 ? 'col-span-2' : 'col-span-1'}`}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
        {filtered.map((p) => (
          <div key={p.profile_id} className="grid grid-cols-12 px-6 py-3 gap-4 items-center hover:bg-zinc-900/30 transition-colors">
            <div className="col-span-3 min-w-0">
              <span className="text-[10px] font-mono text-zinc-300 truncate block">{p.email}</span>
            </div>
            <div className="col-span-2 min-w-0">
              <span className="text-[10px] text-zinc-400 truncate block">{p.display_name ?? '—'}</span>
            </div>
            <div className="col-span-1">
              <span className={`text-[10px] font-mono uppercase ${ROLE_COLORS[p.primary_role] ?? 'text-zinc-500'}`}>
                {p.primary_role}
              </span>
            </div>
            <div className="col-span-1">
              <span className="text-[10px] font-mono text-zinc-500">{p.club_count}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-mono text-zinc-600">
                {new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="col-span-3 flex items-center gap-3">
              <span className={`text-[10px] font-mono uppercase ${p.is_active ? 'text-green-500' : 'text-red-500'}`}>
                {p.is_active ? 'Active' : 'Inactive'}
              </span>
              <button
                onClick={() => handleToggle(p.profile_id, p.is_active)}
                disabled={toggling === p.profile_id}
                className="
                  text-[10px] font-mono uppercase tracking-widest
                  border border-zinc-700 text-zinc-500 px-2 py-1
                  hover:border-zinc-500 hover:text-zinc-300
                  disabled:opacity-40 transition-colors
                "
              >
                {toggling === p.profile_id ? '...' : p.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-[10px] font-mono text-zinc-700 uppercase">No profiles found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
