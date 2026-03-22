'use client'
// components/architect/InspectorPanel.tsx
// Calls the assign_custom_workout RPC directly.
// Full validation on client before sending — RPC validates again server-side.

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { PlannedExercise, Athlete } from './ArchitectClient'

type Message = { type: 'error' | 'success'; text: string }

type Props = {
  activeClubId: string
  workoutTitle: string
  selectedExercise: PlannedExercise | null
  updateExercise: (id: string, updates: Partial<PlannedExercise>) => void
  athletes: Athlete[]
  plannedExercises: PlannedExercise[]
  onSuccessClear: () => void
}

export default function InspectorPanel({
  activeClubId,
  workoutTitle,
  selectedExercise,
  updateExercise,
  athletes,
  plannedExercises,
  onSuccessClear,
}: Props) {
  const [targetAthlete, setTargetAthlete] = useState('')
  const [startDate, setStartDate] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  const supabase = createClient()

  // Client-side validation before calling the RPC
  const validate = (): string | null => {
    if (!targetAthlete) return 'Select an athlete'
    if (!startDate) return 'Select a start date'
    if (!workoutTitle || workoutTitle.trim() === '' || workoutTitle === 'UNTITLED SESSION')
      return 'Enter a workout title'
    if (plannedExercises.length === 0) return 'Add at least one exercise'
    for (const ex of plannedExercises) {
      if (ex.sets <= 0) return `Sets must be > 0 for ${ex.name}`
      if (ex.reps <= 0) return `Reps must be > 0 for ${ex.name}`
      if (ex.load < 0) return `Load must be >= 0 for ${ex.name}`
    }
    return null
  }

  const handleAssign = async () => {
    const validationError = validate()
    if (validationError) {
      setMessage({ type: 'error', text: validationError.toUpperCase() })
      return
    }

    setIsDeploying(true)
    setMessage(null)

    const payloadExercises = plannedExercises.map((ex, index) => ({
      id: ex.id,
      sets: ex.sets,
      reps: ex.reps,
      load: ex.load,
      sort_order: index,
    }))

    try {
      const { error } = await supabase.rpc('assign_custom_workout', {
        p_club_id: activeClubId,
        p_profile_id: targetAthlete,
        p_workout_name: workoutTitle.trim(),
        p_scheduled_date: startDate,
        p_exercises: payloadExercises,
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'WORKOUT ASSIGNED.' })
      setTimeout(() => {
        setMessage(null)
        setTargetAthlete('')
        setStartDate('')
        onSuccessClear()
      }, 2000)
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message?.toUpperCase() ?? 'ASSIGNMENT FAILED.',
      })
    } finally {
      setIsDeploying(false)
    }
  }

  const canAssign =
    !isDeploying &&
    plannedExercises.length > 0 &&
    !!targetAthlete &&
    !!startDate

  return (
    <div className="flex flex-col h-full divide-y divide-zinc-800">
      {/* ── BLOCK INSPECTOR ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest shrink-0">
          Block Inspector
        </h2>

        {!selectedExercise ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-zinc-700 font-mono uppercase text-center">
              Select a block
              <br />to edit its values
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Exercise identity */}
            <div>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-0.5">
                Target
              </p>
              <p className="text-sm font-bold uppercase tracking-tight text-zinc-100">
                {selectedExercise.name}
              </p>
              <span className="inline-block mt-1 text-[9px] font-mono uppercase tracking-wider text-zinc-500 border border-zinc-800 bg-zinc-900 px-1.5 py-0.5">
                {selectedExercise.method?.replace('_', ' ')}
              </span>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Sets
                </span>
                <input
                  type="number"
                  min={1}
                  value={selectedExercise.sets}
                  onChange={(e) =>
                    updateExercise(selectedExercise.instanceId, {
                      sets: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="
                    bg-zinc-900 border border-zinc-800 text-white text-sm
                    p-2 w-full
                    focus:outline-none focus:border-zinc-400
                    transition-colors font-mono
                  "
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Reps
                </span>
                <input
                  type="number"
                  min={1}
                  value={selectedExercise.reps}
                  onChange={(e) =>
                    updateExercise(selectedExercise.instanceId, {
                      reps: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="
                    bg-zinc-900 border border-zinc-800 text-white text-sm
                    p-2 w-full
                    focus:outline-none focus:border-zinc-400
                    transition-colors font-mono
                  "
                />
              </label>

              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Load (lb / kg / %)
                </span>
                <input
                  type="number"
                  min={0}
                  step={2.5}
                  value={selectedExercise.load}
                  onChange={(e) =>
                    updateExercise(selectedExercise.instanceId, {
                      load: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="
                    bg-zinc-900 border border-zinc-800 text-white text-sm
                    p-2 w-full
                    focus:outline-none focus:border-zinc-400
                    transition-colors font-mono
                  "
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ── ASSIGNMENT PANEL ─────────────────────────────── */}
      <div className="shrink-0 p-4 flex flex-col gap-3 bg-zinc-950">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Assign Workout
        </h2>

        {/* Athlete selector — alphabetical (sorted server-side) */}
        <select
          value={targetAthlete}
          onChange={(e) => setTargetAthlete(e.target.value)}
          className="
            w-full bg-zinc-900 border border-zinc-800
            text-sm text-zinc-300 p-2
            focus:outline-none focus:border-zinc-500
            transition-colors
          "
        >
          <option value="">— Select athlete —</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.display_name ?? a.email}
            </option>
          ))}
        </select>

        {/* Date picker */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ colorScheme: 'dark' }}
          className="
            w-full bg-zinc-900 border border-zinc-800
            text-sm text-zinc-300 p-2
            focus:outline-none focus:border-zinc-500
            transition-colors
          "
        />

        {/* Status message */}
        {message && (
          <div
            className={`
              p-2 text-[10px] font-mono uppercase tracking-wide border
              ${
                message.type === 'error'
                  ? 'border-red-900 text-red-400 bg-red-950/20'
                  : 'border-green-900 text-green-400 bg-green-950/20'
              }
            `}
          >
            {message.text}
          </div>
        )}

        {/* Assign button */}
        <button
          onClick={handleAssign}
          disabled={!canAssign}
          className="
            w-full py-3
            bg-white text-black
            text-xs font-bold uppercase tracking-widest
            hover:bg-zinc-200
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {isDeploying ? 'ASSIGNING...' : 'ASSIGN WORKOUT'}
        </button>

        {/* Quick stats */}
        {plannedExercises.length > 0 && (
          <p className="text-[9px] text-zinc-700 font-mono text-center">
            {plannedExercises.length} ex · {plannedExercises.reduce((a, e) => a + e.sets, 0)} sets total
          </p>
        )}
      </div>
    </div>
  )
}
