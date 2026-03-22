'use client'
// components/programs/WorkoutTemplateEditor.tsx
// Inline editor for creating and editing named workout templates.
// These are the reusable building blocks assigned to day slots in a program.

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, GripVertical, Trash2 } from 'lucide-react'
import type { Exercise, WorkoutTemplate, WorkoutTemplateExercise } from './ProgramsClient'

type Props = {
  clubId: string
  template: WorkoutTemplate | null   // null = new template
  exercises: Exercise[]
  onSaved: (wt: WorkoutTemplate) => void
  onCancel: () => void
}

type LocalExercise = {
  instanceId: string
  exerciseId: string
  name: string
  sets: number
  reps: number
  load: number
}

export default function WorkoutTemplateEditor({
  clubId,
  template,
  exercises,
  onSaved,
  onCancel,
}: Props) {
  const [name, setName] = useState(template?.name ?? '')
  const [localExercises, setLocalExercises] = useState<LocalExercise[]>(
    template?.workout_template_exercises
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((e) => ({
        instanceId: e.id,
        exerciseId: e.exercises.id,
        name: e.exercises.name,
        sets: e.planned_sets ?? 3,
        reps: e.planned_reps ?? 5,
        load: e.planned_load_value ?? 0,
      })) ?? []
  )
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  const addExercise = (ex: Exercise) => {
    setLocalExercises((prev) => [
      ...prev,
      {
        instanceId: crypto.randomUUID(),
        exerciseId: ex.id,
        name: ex.name,
        sets: 3,
        reps: 5,
        load: 0,
      },
    ])
    setSearch('')
  }

  const removeExercise = (instanceId: string) => {
    setLocalExercises((prev) => prev.filter((e) => e.instanceId !== instanceId))
  }

  const updateExercise = (instanceId: string, field: 'sets' | 'reps' | 'load', value: number) => {
    setLocalExercises((prev) =>
      prev.map((e) => (e.instanceId === instanceId ? { ...e, [field]: value } : e))
    )
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Template name is required.'); return }
    if (localExercises.length === 0) { setError('Add at least one exercise.'); return }

    setSaving(true)
    setError(null)

    const payload = localExercises.map((e, idx) => ({
      exercise_id: e.exerciseId,
      sort_order: idx,
      planned_sets: e.sets,
      planned_reps: e.reps,
      planned_load_value: e.load,
    }))

    const { data, error: rpcError } = await supabase.rpc('save_workout_template', {
      p_club_id: clubId,
      p_template_id: template?.id ?? null,
      p_name: name.trim(),
      p_exercises: payload,
    })

    setSaving(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    // Fetch the saved template to return full data
    const { data: saved } = await supabase
      .from('workout_templates')
      .select(`
        id, name,
        workout_template_exercises (
          id, sort_order, planned_sets, planned_reps, planned_load_value,
          exercises (id, name, category, method)
        )
      `)
      .eq('id', data as string)
      .single()

    if (saved) onSaved(saved as WorkoutTemplate)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <div>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {template ? 'Edit Workout Template' : 'New Workout Template'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Exercise picker */}
        <div className="w-60 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-zinc-800">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
              Add Exercise
            </p>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="
                w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 p-2
                focus:outline-none focus:border-zinc-600 transition-colors
                placeholder:text-zinc-600
              "
            />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
            {filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => addExercise(ex)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-900/50 transition-colors group"
              >
                <p className="text-[10px] text-zinc-300 group-hover:text-white transition-colors">
                  {ex.name}
                </p>
                <p className="text-[9px] font-mono text-zinc-700 mt-0.5">
                  {ex.category?.replace('_', ' ')}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Template builder */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Template name */}
          <div className="shrink-0 px-4 py-3 border-b border-zinc-800">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="TEMPLATE NAME (e.g. Day A — Squat)"
              className="
                w-full bg-transparent text-sm font-bold uppercase tracking-tight text-zinc-100
                border-b border-transparent focus:border-zinc-700 focus:outline-none
                transition-colors pb-0.5 placeholder:text-zinc-700
              "
            />
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto">
            {localExercises.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-[10px] font-mono text-zinc-700 uppercase text-center">
                  Add exercises from the left panel
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {/* Column headers */}
                <div className="grid grid-cols-12 px-4 py-2 gap-2 bg-zinc-900">
                  <div className="col-span-5 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Exercise</div>
                  <div className="col-span-2 text-[9px] font-mono text-zinc-600 uppercase tracking-widest text-center">Sets</div>
                  <div className="col-span-2 text-[9px] font-mono text-zinc-600 uppercase tracking-widest text-center">Reps</div>
                  <div className="col-span-2 text-[9px] font-mono text-zinc-600 uppercase tracking-widest text-center">Load</div>
                  <div className="col-span-1" />
                </div>

                {localExercises.map((ex, idx) => (
                  <div
                    key={ex.instanceId}
                    className="grid grid-cols-12 px-4 py-2.5 gap-2 items-center hover:bg-zinc-900/30 transition-colors"
                  >
                    {/* Drag handle + name */}
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <span className="text-zinc-800 shrink-0 cursor-grab">
                        <GripVertical size={12} />
                      </span>
                      <span className="text-[9px] font-mono text-zinc-600 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-zinc-200 truncate">{ex.name}</span>
                    </div>

                    {/* Sets */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={ex.sets}
                        onChange={(e) => updateExercise(ex.instanceId, 'sets', Math.max(1, Number(e.target.value)))}
                        className="
                          w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200
                          text-center p-1.5 focus:outline-none focus:border-zinc-600
                          transition-colors font-mono
                        "
                      />
                    </div>

                    {/* Reps */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={ex.reps}
                        onChange={(e) => updateExercise(ex.instanceId, 'reps', Math.max(1, Number(e.target.value)))}
                        className="
                          w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200
                          text-center p-1.5 focus:outline-none focus:border-zinc-600
                          transition-colors font-mono
                        "
                      />
                    </div>

                    {/* Load */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        step={2.5}
                        value={ex.load}
                        onChange={(e) => updateExercise(ex.instanceId, 'load', Math.max(0, Number(e.target.value)))}
                        className="
                          w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200
                          text-center p-1.5 focus:outline-none focus:border-zinc-600
                          transition-colors font-mono
                        "
                      />
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeExercise(ex.instanceId)}
                        className="text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: save */}
          <div className="shrink-0 px-4 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-4">
            {error && (
              <p className="text-[10px] font-mono text-red-500 uppercase">{error}</p>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={onCancel}
                className="
                  px-4 py-2 border border-zinc-700 text-zinc-500
                  text-[10px] font-mono uppercase tracking-widest
                  hover:border-zinc-500 hover:text-zinc-300
                  transition-colors
                "
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="
                  px-4 py-2 bg-white text-black
                  text-[10px] font-bold uppercase tracking-widest
                  hover:bg-zinc-200 disabled:opacity-50
                  transition-colors
                "
              >
                {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
