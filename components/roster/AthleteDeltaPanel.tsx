'use client'
// components/roster/AthleteDeltaPanel.tsx
// Right-side panel showing planned vs actual delta for a selected athlete.
// Fetches from the coach_delta_report view.
// Grouped by workout date, then by exercise.

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type DeltaRow = {
  assigned_workout_id: string
  workout_name: string | null
  scheduled_date: string
  workout_status: string
  exercise_id: string
  exercise_name: string
  planned_sets: number | null
  planned_reps: number | null
  planned_load_value: number | null
  planned_volume: number
  actual_volume: number
  volume_delta: number
  log_status: string | null
  completed_at: string | null
}

type GroupedWorkout = {
  id: string
  name: string | null
  date: string
  status: string
  logStatus: string | null
  completedAt: string | null
  exercises: DeltaRow[]
}

export default function AthleteDeltaPanel({
  athleteId,
  athleteName,
  clubId,
  onClose,
}: {
  athleteId: string
  athleteName: string
  clubId: string
  onClose: () => void
}) {
  const [rows, setRows] = useState<DeltaRow[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    setLoading(true)
    supabase
      .from('coach_delta_report')
      .select('*')
      .eq('club_id', clubId)
      .eq('athlete_id', athleteId)
      .order('scheduled_date', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [athleteId, clubId])

  // Group by workout
  const grouped: GroupedWorkout[] = Object.values(
    rows.reduce<Record<string, GroupedWorkout>>((acc, row) => {
      if (!acc[row.assigned_workout_id]) {
        acc[row.assigned_workout_id] = {
          id: row.assigned_workout_id,
          name: row.workout_name,
          date: row.scheduled_date,
          status: row.workout_status,
          logStatus: row.log_status,
          completedAt: row.completed_at,
          exercises: [],
        }
      }
      acc[row.assigned_workout_id].exercises.push(row)
      return acc
    }, {})
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Panel header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-tight text-zinc-100">
            {athleteName}
          </p>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
            Planned vs Actual
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 text-xs font-mono transition-colors"
        >
          ✕ Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              Loading...
            </p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs font-mono text-zinc-600 uppercase">
              No workout data yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {grouped.map((workout) => {
              const totalPlanned = workout.exercises.reduce(
                (sum, ex) => sum + ex.planned_volume,
                0
              )
              const totalActual = workout.exercises.reduce(
                (sum, ex) => sum + ex.actual_volume,
                0
              )
              const totalDelta = totalActual - totalPlanned
              const isCompleted = workout.logStatus === 'completed'

              return (
                <div key={workout.id} className="p-4 space-y-3">
                  {/* Workout header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-tight text-zinc-200">
                        {workout.name ?? 'Assigned Workout'}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                        {new Date(workout.date).toLocaleDateString('en-ZA', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <StatusBadge
                      workoutStatus={workout.status}
                      logStatus={workout.logStatus}
                    />
                  </div>

                  {/* Exercise rows */}
                  {isCompleted ? (
                    <div className="space-y-1">
                      {/* Column headers */}
                      <div className="grid grid-cols-4 gap-2 text-[9px] font-mono text-zinc-600 uppercase tracking-widest px-2">
                        <span className="col-span-2">Exercise</span>
                        <span className="text-right">Planned</span>
                        <span className="text-right">Actual</span>
                      </div>
                      {workout.exercises.map((ex) => (
                        <ExerciseDeltaRow key={ex.exercise_id} row={ex} />
                      ))}
                      {/* Workout total */}
                      <div className="grid grid-cols-4 gap-2 px-2 pt-2 border-t border-zinc-800">
                        <span className="col-span-2 text-[10px] font-bold font-mono text-zinc-400 uppercase">
                          Total
                        </span>
                        <span className="text-right text-[10px] font-mono text-zinc-400">
                          {totalPlanned.toLocaleString()}
                        </span>
                        <span className="text-right text-[10px] font-mono font-bold">
                          <DeltaValue delta={totalDelta} actual={totalActual} />
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] font-mono text-zinc-700 italic">
                      {workout.status === 'missed'
                        ? 'Missed — no data recorded.'
                        : workout.status === 'skipped'
                        ? 'Skipped by athlete.'
                        : 'Not yet completed.'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function ExerciseDeltaRow({ row }: { row: DeltaRow }) {
  return (
    <div className="grid grid-cols-4 gap-2 px-2 py-1 hover:bg-zinc-900/50 transition-colors">
      <div className="col-span-2 min-w-0">
        <p className="text-[10px] text-zinc-300 truncate">{row.exercise_name}</p>
        <p className="text-[9px] font-mono text-zinc-600">
          {row.planned_sets}×{row.planned_reps}
          {row.planned_load_value ? ` @ ${row.planned_load_value}` : ''}
        </p>
      </div>
      <div className="text-right text-[10px] font-mono text-zinc-500">
        {row.planned_volume > 0 ? row.planned_volume.toLocaleString() : '—'}
      </div>
      <div className="text-right text-[10px] font-mono">
        <DeltaValue delta={row.volume_delta} actual={row.actual_volume} />
      </div>
    </div>
  )
}

function DeltaValue({ delta, actual }: { delta: number; actual: number }) {
  if (actual === 0) return <span className="text-zinc-700">—</span>

  const color =
    delta > 0
      ? 'text-green-400'
      : delta < 0
      ? 'text-red-400'
      : 'text-zinc-400'

  return (
    <span className={color}>
      {actual.toLocaleString()}
      {delta !== 0 && (
        <span className="text-[9px] ml-1 opacity-70">
          ({delta > 0 ? '+' : ''}{delta.toLocaleString()})
        </span>
      )}
    </span>
  )
}

function StatusBadge({
  workoutStatus,
  logStatus,
}: {
  workoutStatus: string
  logStatus: string | null
}) {
  const status = logStatus ?? workoutStatus

  const styles: Record<string, string> = {
    completed:   'border-green-900 text-green-500',
    in_progress: 'border-yellow-900 text-yellow-500',
    missed:      'border-red-900 text-red-500',
    skipped:     'border-zinc-700 text-zinc-500',
    assigned:    'border-zinc-800 text-zinc-600',
  }

  return (
    <span
      className={`
        text-[9px] font-mono uppercase tracking-widest
        border px-1.5 py-0.5 shrink-0
        ${styles[status] ?? styles.assigned}
      `}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
