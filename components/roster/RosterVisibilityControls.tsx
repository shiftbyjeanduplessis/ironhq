'use client'
// components/roster/RosterVisibilityControls.tsx
// Inline visibility controls added to the roster table.
// Each athlete row has a visibility dropdown and squad board toggle.
// Changes call update_athlete_visibility RPC directly.

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type AthleteRow = {
  athlete_id: string
  athlete_name: string
  athlete_email: string
  compliance_rate: number | null
  completed: number
  missed: number
  upcoming: number
  last_active: string | null
  billing_status: string | null
  visibility_override: string | null
  squad_board_visible: boolean
}

const VIS_OPTIONS = [
  { value: 'name_only',   label: 'Name only'   },
  { value: 'basic_stats', label: 'Basic stats'  },
  { value: 'full_stats',  label: 'Full stats'   },
]

const VIS_COLORS: Record<string, string> = {
  full_stats:  'text-green-400 border-green-900',
  basic_stats: 'text-blue-400 border-blue-900',
  name_only:   'text-zinc-500 border-zinc-700',
}

export default function RosterVisibilityControls({
  athlete,
  clubId,
  clubDefaultVis,
  onUpdate,
}: {
  athlete: AthleteRow
  clubId: string
  clubDefaultVis: string
  onUpdate: (id: string, changes: Partial<AthleteRow>) => void
}) {
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  const effectiveVis = athlete.visibility_override ?? clubDefaultVis
  const isOverride = !!athlete.visibility_override

  const handleVisChange = async (newVis: string) => {
    setUpdating(true)
    onUpdate(athlete.athlete_id, { visibility_override: newVis })
    await supabase.rpc('update_athlete_visibility', {
      p_club_id:            clubId,
      p_athlete_profile_id: athlete.athlete_id,
      p_visibility:         newVis,
      p_squad_visible:      null,
    })
    setUpdating(false)
  }

  const handleSquadToggle = async () => {
    const newVal = !athlete.squad_board_visible
    setUpdating(true)
    onUpdate(athlete.athlete_id, { squad_board_visible: newVal })
    await supabase.rpc('update_athlete_visibility', {
      p_club_id:            clubId,
      p_athlete_profile_id: athlete.athlete_id,
      p_visibility:         null,
      p_squad_visible:      newVal,
    })
    setUpdating(false)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Visibility dropdown */}
      <select
        value={effectiveVis}
        onChange={(e) => handleVisChange(e.target.value)}
        disabled={updating}
        className={`
          text-[10px] font-mono uppercase
          bg-transparent border px-1.5 py-0.5
          focus:outline-none disabled:opacity-50
          transition-colors
          ${VIS_COLORS[effectiveVis] ?? VIS_COLORS.basic_stats}
        `}
      >
        {VIS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-zinc-950 text-zinc-200 normal-case font-normal">
            {opt.label}
          </option>
        ))}
      </select>

      {/* Squad toggle */}
      <button
        onClick={handleSquadToggle}
        disabled={updating}
        title={athlete.squad_board_visible ? 'Visible on squad board' : 'Hidden from squad board'}
        className={`
          w-5 h-5 flex items-center justify-center
          border transition-colors disabled:opacity-50
          ${athlete.squad_board_visible
            ? 'border-green-900 text-green-500'
            : 'border-zinc-700 text-zinc-700'}
        `}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          {athlete.squad_board_visible
            ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
          }
        </svg>
      </button>

      {/* Override indicator */}
      {isOverride && (
        <span className="text-[8px] font-mono text-amber-600 uppercase tracking-wider border border-amber-900 px-1">
          Override
        </span>
      )}
    </div>
  )
}
