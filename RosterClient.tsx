'use client'
// components/logger/LoggerClient.tsx
// Mobile-first, high-contrast, fast set logging.
// Uses optimistic UI via local state — mutations go through RPCs.
// Falls back gracefully on RPC error.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import NoticeWall from './NoticeWall'

// ── Types ────────────────────────────────────────────────────

type AssignedExercise = {
  id: string
  sort_order: number
  planned_sets: number
  planned_reps: number
  planned_load_value: number | null
  planned_percentage: number | null
  exercises: {
    id: string
    name: string
    category: string
    method: string
  }
}

type AssignedWorkout = {
  id: string
  workout_name: string | null
  scheduled_date: string
  status: string
  assigned_workout_exercises: AssignedExercise[]
}

type Notice = {
  id: string
  title: string
  body: string
  priority: string
  requires_acknowledgement: boolean
}

type RecentLog = {
  id: string
  manual_workout_title: string | null
  completed_at: string | null
  total_volume: number | null
  assigned_workout_id: string | null
}

type PR = {
  id: string
  exercise_name_snapshot: string
  pr_type: string
  value: number
  achieved_on: string
}

type LoggedSet = {
  id: string   // optimistic or server id
  reps: number
  load: number
  rpe: number | null
  synced: boolean
}

type ExerciseLog = {
  exerciseId: string          // assigned_workout_exercise.id
  dbExerciseId: string        // exercise.id
  name: string
  plannedSets: number
  plannedReps: number
  plannedLoad: number | null
  logExerciseId: string | null  // workout_log_exercise.id once started
  sets: LoggedSet[]
}

type WorkoutSession = {
  logId: string
  exercises: ExerciseLog[]
  phase: 'active' | 'completing' | 'done'
}

// ── Main Component ────────────────────────────────────────────

type Props = {
  pendingNotice: Notice | null
  nextWorkout: AssignedWorkout | null
  recentLogs: RecentLog[]
  recentPRs: PR[]
  userId: string
}

export default function LoggerClient({
  pendingNotice,
  nextWorkout,
  recentLogs,
  recentPRs,
}: Props) {
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [starting, setStarting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [activeExIdx, setActiveExIdx] = useState(0)
  const [noticeCleared, setNoticeCleared] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  // ── Notice wall gate ─────────────────────────────────────
  if (pendingNotice && !noticeCleared) {
    return (
      <NoticeWall
        notice={pendingNotice}
        onAcknowledge={async () => {
          await supabase.from('notice_acknowledgements').insert({
            notice_id: pendingNotice.id,
          })
          setNoticeCleared(true)
        }}
      />
    )
  }

  // ── Start workout ─────────────────────────────────────────
  const handleStartWorkout = async () => {
    if (!nextWorkout) return
    setStarting(true)

    const { data, error } = await supabase.rpc('start_assigned_workout', {
      p_assigned_workout_id: nextWorkout.id,
    })

    if (error || !data) {
      setStarting(false)
      alert('Could not start workout. Please try again.')
      return
    }

    // Build session from the assigned workout structure
    const exercises: ExerciseLog[] = nextWorkout.assigned_workout_exercises
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((ae) => ({
        exerciseId: ae.id,
        dbExerciseId: ae.exercises.id,
        name: ae.exercises.name,
        plannedSets: ae.planned_sets ?? 3,
        plannedReps: ae.planned_reps ?? 5,
        plannedLoad: ae.planned_load_value,
        logExerciseId: null,
        sets: [],
      }))

    // Fetch the log exercise IDs that were created by start_assigned_workout
    const { data: logExercises } = await supabase
      .from('workout_log_exercises')
      .select('id, source_assigned_exercise_id')
      .eq('workout_log_id', data)

    const enrichedExercises = exercises.map((ex) => {
      const found = logExercises?.find(
        (le) => le.source_assigned_exercise_id === ex.exerciseId
      )
      return { ...ex, logExerciseId: found?.id ?? null }
    })

    setSession({
      logId: data,
      exercises: enrichedExercises,
      phase: 'active',
    })
    setActiveExIdx(0)
    setStarting(false)
  }

  // ── Log a set (optimistic) ────────────────────────────────
  const handleLogSet = async (
    exIdx: number,
    reps: number,
    load: number,
    rpe: number | null
  ) => {
    if (!session) return

    const ex = session.exercises[exIdx]
    if (!ex.logExerciseId) return

    // Optimistic: add immediately with temp id
    const tempId = `temp-${Date.now()}`
    const optimisticSet: LoggedSet = {
      id: tempId, reps, load, rpe, synced: false,
    }

    setSession((prev) => {
      if (!prev) return prev
      const exercises = [...prev.exercises]
      exercises[exIdx] = {
        ...exercises[exIdx],
        sets: [...exercises[exIdx].sets, optimisticSet],
      }
      return { ...prev, exercises }
    })

    // Server write
    const { data: setId, error } = await supabase.rpc('save_log_set', {
      p_workout_log_exercise_id: ex.logExerciseId,
      p_actual_reps: reps,
      p_actual_load: load,
      p_actual_rpe: rpe,
    })

    if (error) {
      // Roll back the optimistic set
      setSession((prev) => {
        if (!prev) return prev
        const exercises = [...prev.exercises]
        exercises[exIdx] = {
          ...exercises[exIdx],
          sets: exercises[exIdx].sets.filter((s) => s.id !== tempId),
        }
        return { ...prev, exercises }
      })
      alert(`Failed to save set: ${error.message}`)
      return
    }

    // Confirm with real id
    setSession((prev) => {
      if (!prev) return prev
      const exercises = [...prev.exercises]
      exercises[exIdx] = {
        ...exercises[exIdx],
        sets: exercises[exIdx].sets.map((s) =>
          s.id === tempId ? { ...s, id: setId as string, synced: true } : s
        ),
      }
      return { ...prev, exercises }
    })
  }

  // ── Complete workout ──────────────────────────────────────
  const handleComplete = async () => {
    if (!session) return
    setCompleting(true)

    const { error } = await supabase.rpc('complete_workout', {
      p_workout_log_id: session.logId,
    })

    if (error) {
      setCompleting(false)
      alert(`Could not complete workout: ${error.message}`)
      return
    }

    setSession((prev) => prev ? { ...prev, phase: 'done' } : prev)
    setCompleting(false)
    router.refresh()
  }

  // ── Dashboard (no active session) ────────────────────────
  if (!session) {
    return (
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Next up */}
        <section className="p-4 border-b border-zinc-800">
          <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Next Up
          </h2>

          {nextWorkout ? (
            <div className="border border-zinc-800 bg-zinc-900">
              <div className="p-4 border-b border-zinc-800">
                <p className="text-base font-bold uppercase tracking-tight text-zinc-100">
                  {nextWorkout.workout_name ?? 'Assigned Workout'}
                </p>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">
                  {new Date(nextWorkout.scheduled_date).toLocaleDateString('en-ZA', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
              </div>

              {/* Exercise preview */}
              <div className="divide-y divide-zinc-800">
                {nextWorkout.assigned_workout_exercises
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((ae) => (
                    <div key={ae.id} className="px-4 py-2 flex items-center justify-between">
                      <span className="text-xs text-zinc-300 font-medium">
                        {ae.exercises.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-600">
                        {ae.planned_sets}×{ae.planned_reps}
                        {ae.planned_load_value ? ` @ ${ae.planned_load_value}` : ''}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="p-4">
                <button
                  onClick={handleStartWorkout}
                  disabled={starting}
                  className="
                    w-full py-4
                    bg-white text-black
                    text-sm font-bold uppercase tracking-widest
                    hover:bg-zinc-200
                    disabled:opacity-50
                    transition-colors
                  "
                >
                  {starting ? 'STARTING...' : 'START WORKOUT'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-zinc-800 p-8 text-center">
              <p className="text-xs text-zinc-600 font-mono uppercase">
                No workout scheduled
              </p>
              <p className="text-[10px] text-zinc-700 font-mono mt-1">
                Contact your coach to get programmed
              </p>
            </div>
          )}
        </section>

        {/* Recent PRs */}
        {recentPRs.length > 0 && (
          <section className="p-4 border-b border-zinc-800">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Recent PRs
            </h2>
            <div className="space-y-2">
              {recentPRs.map((pr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between border border-zinc-800 bg-zinc-900 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-zinc-200">
                      {pr.exercise_name_snapshot}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-600">
                      {pr.pr_type} · {pr.achieved_on}
                    </p>
                  </div>
                  <span className="text-sm font-bold font-mono text-white">
                    {pr.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent workouts */}
        {recentLogs.length > 0 && (
          <section className="p-4">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Recent Workouts
            </h2>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-zinc-800 bg-zinc-900 px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs text-zinc-300">
                      {log.manual_workout_title ?? 'Assigned Workout'}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-600">
                      {log.completed_at
                        ? new Date(log.completed_at).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                  {log.total_volume ? (
                    <span className="text-[10px] font-mono text-zinc-500">
                      {log.total_volume.toLocaleString()} total
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    )
  }

  // ── Active workout session ────────────────────────────────
  if (session.phase === 'done') {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-xl font-bold uppercase tracking-tight text-white">
          Workout Complete
        </p>
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
          Nice work. Check your PRs.
        </p>
        <button
          onClick={() => setSession(null)}
          className="
            mt-4 px-6 py-3
            border border-zinc-700 text-zinc-400
            text-xs font-mono uppercase tracking-widest
            hover:border-zinc-500 hover:text-zinc-200
            transition-colors
          "
        >
          Back to Dashboard
        </button>
      </main>
    )
  }

  const activeEx = session.exercises[activeExIdx]

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Exercise nav strip */}
      <div className="shrink-0 flex overflow-x-auto border-b border-zinc-800 bg-zinc-900">
        {session.exercises.map((ex, idx) => (
          <button
            key={ex.exerciseId}
            onClick={() => setActiveExIdx(idx)}
            className={`
              shrink-0 px-4 py-3 text-[10px] font-mono uppercase tracking-wider
              border-r border-zinc-800 transition-colors whitespace-nowrap
              ${
                idx === activeExIdx
                  ? 'text-white bg-zinc-800 border-b-2 border-b-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }
            `}
          >
            {String(idx + 1).padStart(2, '0')} {ex.name}
            {ex.sets.length > 0 && (
              <span className="ml-1 text-green-500">
                ({ex.sets.length}/{ex.plannedSets})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active exercise logger */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Exercise header */}
        <div>
          <p className="text-xl font-bold uppercase tracking-tight text-white">
            {activeEx.name}
          </p>
          <p className="text-[10px] font-mono text-zinc-500 mt-1">
            Target: {activeEx.plannedSets} × {activeEx.plannedReps}
            {activeEx.plannedLoad ? ` @ ${activeEx.plannedLoad}` : ''}
          </p>
        </div>

        {/* Logged sets */}
        <div className="space-y-2">
          {activeEx.sets.map((set, i) => (
            <div
              key={set.id}
              className={`
                border px-4 py-2 flex items-center justify-between
                font-mono text-xs
                ${set.synced ? 'border-green-900 bg-green-950/10 text-green-400' : 'border-zinc-700 text-zinc-400'}
              `}
            >
              <span className="text-zinc-600">SET {i + 1}</span>
              <span>{set.reps} reps @ {set.load}</span>
              {set.rpe && <span className="text-zinc-600">RPE {set.rpe}</span>}
              {!set.synced && <span className="text-[9px] text-zinc-700">SAVING...</span>}
            </div>
          ))}
        </div>

        {/* Set entry */}
        <SetEntry
          setNumber={activeEx.sets.length + 1}
          plannedReps={activeEx.plannedReps}
          plannedLoad={activeEx.plannedLoad}
          onLog={(reps, load, rpe) => handleLogSet(activeExIdx, reps, load, rpe)}
        />
      </div>

      {/* Footer: navigation + complete */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-4 flex gap-3">
        {activeExIdx < session.exercises.length - 1 ? (
          <button
            onClick={() => setActiveExIdx((i) => i + 1)}
            className="
              flex-1 py-3
              border border-zinc-700 text-zinc-400
              text-xs font-bold uppercase tracking-widest
              hover:border-zinc-500 hover:text-white
              transition-colors
            "
          >
            Next Exercise →
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="
              flex-1 py-3
              bg-white text-black
              text-xs font-bold uppercase tracking-widest
              hover:bg-zinc-200
              disabled:opacity-50
              transition-colors
            "
          >
            {completing ? 'SAVING...' : 'COMPLETE WORKOUT'}
          </button>
        )}
      </div>
    </main>
  )
}

// ── Set Entry Sub-component ───────────────────────────────────
function SetEntry({
  setNumber,
  plannedReps,
  plannedLoad,
  onLog,
}: {
  setNumber: number
  plannedReps: number
  plannedLoad: number | null
  onLog: (reps: number, load: number, rpe: number | null) => void
}) {
  const [reps, setReps] = useState(String(plannedReps))
  const [load, setLoad] = useState(String(plannedLoad ?? 0))
  const [rpe, setRpe] = useState('')

  const handleLog = () => {
    const r = parseInt(reps)
    const l = parseFloat(load)
    const e = rpe ? parseFloat(rpe) : null
    if (isNaN(r) || r < 0) return
    if (isNaN(l) || l < 0) return
    onLog(r, l, e)
    setReps(String(plannedReps))
    setLoad(String(plannedLoad ?? l))
    setRpe('')
  }

  return (
    <div className="border border-zinc-800 bg-zinc-900 p-4 space-y-4">
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
        Log Set {setNumber}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">Reps</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="
              bg-zinc-950 border border-zinc-700 text-white text-lg font-bold
              text-center p-3
              focus:outline-none focus:border-zinc-400
              transition-colors
            "
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">Load</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={2.5}
            value={load}
            onChange={(e) => setLoad(e.target.value)}
            className="
              bg-zinc-950 border border-zinc-700 text-white text-lg font-bold
              text-center p-3
              focus:outline-none focus:border-zinc-400
              transition-colors
            "
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-600 uppercase">RPE</span>
          <input
            type="number"
            inputMode="decimal"
            min={5}
            max={10}
            step={0.5}
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            placeholder="—"
            className="
              bg-zinc-950 border border-zinc-700 text-white text-lg font-bold
              text-center p-3
              focus:outline-none focus:border-zinc-400
              transition-colors placeholder:text-zinc-700
            "
          />
        </label>
      </div>

      <button
        onClick={handleLog}
        className="
          w-full py-4
          bg-white text-black
          text-sm font-bold uppercase tracking-widest
          hover:bg-zinc-200
          active:scale-95
          transition-all
        "
      >
        LOG SET {setNumber}
      </button>
    </div>
  )
}
