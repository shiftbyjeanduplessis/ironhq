'use client'
// components/roster/RosterClient.tsx
// High-density coach roster table.
// Columns: athlete name, compliance %, workouts, last active, billing status.
// Billing status is editable inline via direct Supabase update.
// Clicking an athlete row opens their delta drill-down.

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import AthleteDeltaPanel from './AthleteDeltaPanel'

type RosterRow = {
  club_id: string
  athlete_id: string
  athlete_name: string
  athlete_email: string
  total_workouts: number
  completed: number
  missed: number
  skipped: number
  upcoming: number
  compliance_rate: number | null
  last_active: string | null
  billing_status: string | null
  next_billing_date: string | null
  club_role: string
  membership_status: string
}

type Props = {
  roster: RosterRow[]
  activeClubId: string
}

const BILLING_OPTIONS = ['paid', 'unpaid', 'past_due', 'comped'] as const
type BillingStatus = typeof BILLING_OPTIONS[number]

const BILLING_STYLES: Record<BillingStatus, string> = {
  paid:     'text-green-400 border-green-900',
  unpaid:   'text-zinc-400 border-zinc-700',
  past_due: 'text-red-400 border-red-900',
  comped:   'text-blue-400 border-blue-900',
}

export default function RosterClient({ roster, activeClubId }: Props) {
  const [localRoster, setLocalRoster] = useState<RosterRow[]>(roster)
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null)
  const [updatingBilling, setUpdatingBilling] = useState<string | null>(null)

  const supabase = createClient()

  const handleBillingChange = async (
    athleteId: string,
    newStatus: BillingStatus
  ) => {
    setUpdatingBilling(athleteId)

    // Optimistic update
    setLocalRoster((prev) =>
      prev.map((r) =>
        r.athlete_id === athleteId ? { ...r, billing_status: newStatus } : r
      )
    )

    const { error } = await supabase
      .from('club_memberships')
      .update({ billing_status: newStatus })
      .eq('club_id', activeClubId)
      .eq('profile_id', athleteId)

    if (error) {
      // Roll back
      setLocalRoster(roster)
      alert(`Failed to update billing: ${error.message}`)
    }

    setUpdatingBilling(null)
  }

  const selectedAthlete = localRoster.find((r) => r.athlete_id === selectedAthleteId)

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Roster Table ─────────────────────────────────── */}
      <div className={`flex flex-col overflow-hidden transition-all ${selectedAthleteId ? 'w-1/2' : 'w-full'}`}>
        {/* Table header */}
        <div className="shrink-0 grid grid-cols-12 border-b border-zinc-800 bg-zinc-900 px-4 py-2 gap-0">
          <div className="col-span-3 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">Athlete</div>
          <div className="col-span-2 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">Compliance</div>
          <div className="col-span-1 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">Done</div>
          <div className="col-span-1 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">Missed</div>
          <div className="col-span-1 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">Due</div>
          <div className="col-span-2 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">Last Active</div>
          <div className="col-span-2 text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">Billing</div>
        </div>

        {/* Table rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {localRoster.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-mono text-zinc-600 uppercase">
                No athletes in this club yet.
              </p>
              <p className="text-[10px] font-mono text-zinc-700 mt-1">
                Invite athletes using the invite system.
              </p>
            </div>
          ) : (
            localRoster.map((row) => (
              <RosterRow
                key={row.athlete_id}
                row={row}
                isSelected={selectedAthleteId === row.athlete_id}
                isUpdatingBilling={updatingBilling === row.athlete_id}
                onSelect={() =>
                  setSelectedAthleteId(
                    selectedAthleteId === row.athlete_id ? null : row.athlete_id
                  )
                }
                onBillingChange={(status) =>
                  handleBillingChange(row.athlete_id, status)
                }
              />
            ))
          )}
        </div>

        {/* Summary footer */}
        {localRoster.length > 0 && (
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 py-2 flex items-center gap-6">
            <span className="text-[10px] font-mono text-zinc-500">
              {localRoster.length} athletes
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              Avg compliance:{' '}
              <span className="text-zinc-300">
                {localRoster.filter((r) => r.compliance_rate !== null).length === 0
                  ? '—'
                  : Math.round(
                      localRoster
                        .filter((r) => r.compliance_rate !== null)
                        .reduce((sum, r) => sum + (r.compliance_rate ?? 0), 0) /
                        localRoster.filter((r) => r.compliance_rate !== null).length
                    ) + '%'}
              </span>
            </span>
            <span className="text-[10px] font-mono text-red-500">
              {localRoster.filter((r) => r.billing_status === 'past_due').length > 0
                ? `${localRoster.filter((r) => r.billing_status === 'past_due').length} past due`
                : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Delta Panel ───────────────────────────────────── */}
      {selectedAthleteId && selectedAthlete && (
        <div className="w-1/2 border-l border-zinc-800 flex flex-col overflow-hidden">
          <AthleteDeltaPanel
            athleteId={selectedAthleteId}
            athleteName={selectedAthlete.athlete_name}
            clubId={activeClubId}
            onClose={() => setSelectedAthleteId(null)}
          />
        </div>
      )}
    </div>
  )
}

// ── RosterRow sub-component ───────────────────────────────────
function RosterRow({
  row,
  isSelected,
  isUpdatingBilling,
  onSelect,
  onBillingChange,
}: {
  row: RosterRow
  isSelected: boolean
  isUpdatingBilling: boolean
  onSelect: () => void
  onBillingChange: (status: BillingStatus) => void
}) {
  const compliance = row.compliance_rate

  const complianceColor =
    compliance === null
      ? 'text-zinc-600'
      : compliance >= 80
      ? 'text-green-400'
      : compliance >= 60
      ? 'text-yellow-400'
      : 'text-red-400'

  const billingKey = (row.billing_status ?? 'unpaid') as BillingStatus
  const billingStyle = BILLING_STYLES[billingKey] ?? BILLING_STYLES.unpaid

  return (
    <div
      className={`
        grid grid-cols-12 gap-0 px-4 py-2.5
        cursor-pointer transition-colors text-xs
        ${isSelected ? 'bg-zinc-800' : 'hover:bg-zinc-900/50'}
      `}
      onClick={onSelect}
    >
      {/* Name */}
      <div className="col-span-3 flex flex-col justify-center min-w-0">
        <p className="font-medium text-zinc-100 truncate">
          {row.athlete_name ?? row.athlete_email}
        </p>
        <p className="text-[10px] font-mono text-zinc-600 truncate">
          {row.athlete_email}
        </p>
      </div>

      {/* Compliance */}
      <div className={`col-span-2 flex items-center font-bold font-mono ${complianceColor}`}>
        {compliance !== null ? `${compliance}%` : '—'}
      </div>

      {/* Done */}
      <div className="col-span-1 flex items-center font-mono text-zinc-400">
        {row.completed}
      </div>

      {/* Missed */}
      <div className={`col-span-1 flex items-center font-mono ${row.missed > 0 ? 'text-red-500' : 'text-zinc-600'}`}>
        {row.missed}
      </div>

      {/* Upcoming */}
      <div className="col-span-1 flex items-center font-mono text-zinc-500">
        {row.upcoming}
      </div>

      {/* Last active */}
      <div className="col-span-2 flex items-center font-mono text-zinc-500 text-[10px]">
        {row.last_active
          ? new Date(row.last_active).toLocaleDateString('en-ZA', {
              day: 'numeric',
              month: 'short',
            })
          : '—'}
      </div>

      {/* Billing status dropdown */}
      <div
        className="col-span-2 flex items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <select
          value={row.billing_status ?? 'unpaid'}
          disabled={isUpdatingBilling}
          onChange={(e) => onBillingChange(e.target.value as BillingStatus)}
          className={`
            text-[10px] font-mono font-bold uppercase
            bg-transparent border px-1.5 py-0.5
            focus:outline-none
            disabled:opacity-50
            transition-colors
            ${billingStyle}
          `}
        >
          {BILLING_OPTIONS.map((opt) => (
            <option key={opt} value={opt} className="bg-zinc-950 text-zinc-200 normal-case font-normal">
              {opt.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
