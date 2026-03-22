'use client'
// components/programs/ProgramsClient.tsx
// Multi-week program template builder.
// Left pane: list of programs + create button.
// Right pane: the program grid (weeks × days) + workout slot assignment.
// Coaches drag workout templates onto day slots, or click to assign.

import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Archive, Save, ChevronDown, ChevronRight, Dumbbell } from 'lucide-react'
import WorkoutTemplateEditor from './WorkoutTemplateEditor'

// ── Types ─────────────────────────────────────────────────────

export type Exercise = {
  id: string
  name: string
  category: string
  method: string
}

export type WorkoutTemplateExercise = {
  id: string
  sort_order: number
  planned_sets: number | null
  planned_reps: number | null
  planned_load_value: number | null
  exercises: Exercise
}

export type WorkoutTemplate = {
  id: string
  name: string
  workout_template_exercises: WorkoutTemplateExercise[]
}

type Slot = {
  id: string
  day_index: number
  slot_label: string | null
  workout_template_id: string | null
}

type Week = {
  id: string
  week_number: number
  phase_name: string | null
  program_week_slots: Slot[]
}

type Program = {
  id: string
  name: string
  total_weeks: number
  default_rounding_increment: number
  is_archived: boolean
  created_at: string
  program_weeks: Week[]
}

type Props = {
  activeClubId: string
  coachProfileId: string
  programs: Program[]
  workoutTemplates: WorkoutTemplate[]
  exercises: Exercise[]
  initialProgramId: string | null
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Main Component ────────────────────────────────────────────

export default function ProgramsClient({
  activeClubId,
  programs: initialPrograms,
  workoutTemplates: initialWorkoutTemplates,
  exercises,
  initialProgramId,
}: Props) {
  const [programs, setPrograms] = useState<Program[]>(initialPrograms)
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>(initialWorkoutTemplates)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    initialProgramId ?? initialPrograms[0]?.id ?? null
  )
  const [showNewProgramForm, setShowNewProgramForm] = useState(false)
  const [showWorkoutTemplateEditor, setShowWorkoutTemplateEditor] = useState(false)
  const [editingWorkoutTemplate, setEditingWorkoutTemplate] = useState<WorkoutTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) ?? null

  // Build the local editable grid from selected program
  const [grid, setGrid] = useState<Record<string, Record<number, string | null>>>(() =>
    buildGrid(selectedProgram)
  )
  const [phaseNames, setPhaseNames] = useState<Record<number, string>>(() =>
    buildPhaseNames(selectedProgram)
  )
  const [programName, setProgramName] = useState(selectedProgram?.name ?? '')
  const [totalWeeks, setTotalWeeks] = useState(selectedProgram?.total_weeks ?? 4)
  const [increment, setIncrement] = useState(selectedProgram?.default_rounding_increment ?? 2.5)

  const selectProgram = (p: Program) => {
    setSelectedProgramId(p.id)
    setGrid(buildGrid(p))
    setPhaseNames(buildPhaseNames(p))
    setProgramName(p.name)
    setTotalWeeks(p.total_weeks)
    setIncrement(p.default_rounding_increment)
    setShowNewProgramForm(false)
    router.push(`${pathname}?clubId=${activeClubId}&programId=${p.id}`, { scroll: false })
  }

  const handleNewProgram = () => {
    setSelectedProgramId(null)
    setProgramName('NEW PROGRAM')
    setTotalWeeks(4)
    setIncrement(2.5)
    setGrid({})
    setPhaseNames({})
    setShowNewProgramForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)

    // Build the JSONB payload
    const weeks = Array.from({ length: totalWeeks }, (_, i) => {
      const weekNum = i + 1
      const slots = DAYS.map((_, dayIdx) => ({
        day_index: dayIdx,
        workout_template_id: grid[weekNum]?.[dayIdx] ?? null,
        slot_label: null,
      })).filter((s) => s.workout_template_id !== null)

      return {
        week_number: weekNum,
        phase_name: phaseNames[weekNum] ?? null,
        slots,
      }
    })

    const payload = {
      name: programName,
      total_weeks: totalWeeks,
      default_rounding_increment: increment,
      weeks,
    }

    const { data, error } = await supabase.rpc('save_program_template', {
      p_club_id: activeClubId,
      p_template_id: selectedProgramId,
      p_payload: payload,
    })

    setSaving(false)

    if (error) {
      setSaveMessage(`Error: ${error.message}`)
      return
    }

    setSaveMessage('Saved.')
    setTimeout(() => setSaveMessage(null), 2000)

    // Refetch programs
    const { data: refreshed } = await supabase
      .from('program_templates')
      .select(`
        id, name, total_weeks, default_rounding_increment, is_archived, created_at,
        program_weeks (
          id, week_number, phase_name,
          program_week_slots ( id, day_index, slot_label, workout_template_id )
        )
      `)
      .eq('club_id', activeClubId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (refreshed) {
      setPrograms(refreshed)
      const saved = refreshed.find((p) => p.id === (data as string))
      if (saved) selectProgram(saved)
    }
  }

  const handleArchive = async (programId: string) => {
    if (!confirm('Archive this program? Existing assignments will not be affected.')) return

    const { error } = await supabase.rpc('archive_program_template', {
      p_club_id: activeClubId,
      p_template_id: programId,
    })

    if (error) { alert(error.message); return }

    setPrograms((prev) => prev.filter((p) => p.id !== programId))
    if (selectedProgramId === programId) {
      setSelectedProgramId(null)
      setProgramName('')
    }
  }

  const handleSlotChange = (weekNum: number, dayIdx: number, templateId: string | null) => {
    setGrid((prev) => ({
      ...prev,
      [weekNum]: { ...(prev[weekNum] ?? {}), [dayIdx]: templateId },
    }))
  }

  const handleWorkoutTemplateSaved = (wt: WorkoutTemplate) => {
    setWorkoutTemplates((prev) => {
      const exists = prev.find((t) => t.id === wt.id)
      return exists ? prev.map((t) => (t.id === wt.id ? wt : t)) : [wt, ...prev]
    })
    setShowWorkoutTemplateEditor(false)
    setEditingWorkoutTemplate(null)
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left: Program List ───────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Programs
          </span>
          <button
            onClick={handleNewProgram}
            className="
              flex items-center gap-1
              text-[10px] font-mono uppercase tracking-widest
              border border-zinc-700 text-zinc-400 px-2 py-1
              hover:border-white hover:text-white transition-colors
            "
          >
            <Plus size={10} /> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {programs.length === 0 && !showNewProgramForm && (
            <div className="p-6 text-center">
              <p className="text-[10px] font-mono text-zinc-600 uppercase">
                No programs yet.
              </p>
              <p className="text-[10px] font-mono text-zinc-700 mt-1">
                Create your first program above.
              </p>
            </div>
          )}

          {programs.map((program) => (
            <div
              key={program.id}
              onClick={() => selectProgram(program)}
              className={`
                px-4 py-3 cursor-pointer transition-colors group
                ${selectedProgramId === program.id ? 'bg-zinc-800' : 'hover:bg-zinc-900/50'}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-100 truncate">
                    {program.name}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                    {program.total_weeks} week{program.total_weeks !== 1 ? 's' : ''}
                    {' · '}
                    {program.program_weeks.reduce(
                      (acc, w) => acc + w.program_week_slots.length,
                      0
                    )} sessions
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleArchive(program.id) }}
                  className="
                    opacity-0 group-hover:opacity-100
                    text-zinc-700 hover:text-red-500
                    transition-all ml-2 shrink-0
                  "
                  title="Archive program"
                >
                  <Archive size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Workout Templates section */}
        <div className="shrink-0 border-t border-zinc-800">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Workout Templates
            </span>
            <button
              onClick={() => { setEditingWorkoutTemplate(null); setShowWorkoutTemplateEditor(true) }}
              className="
                flex items-center gap-1
                text-[10px] font-mono uppercase tracking-widest
                border border-zinc-700 text-zinc-400 px-2 py-1
                hover:border-white hover:text-white transition-colors
              "
            >
              <Plus size={10} /> New
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-zinc-900">
            {workoutTemplates.map((wt) => (
              <div
                key={wt.id}
                className="px-4 py-2 flex items-center justify-between group hover:bg-zinc-900/50 cursor-pointer"
                onClick={() => { setEditingWorkoutTemplate(wt); setShowWorkoutTemplateEditor(true) }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] text-zinc-300 truncate">{wt.name}</p>
                  <p className="text-[9px] font-mono text-zinc-600">
                    {wt.workout_template_exercises.length} exercise{wt.workout_template_exercises.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Dumbbell size={10} className="text-zinc-700 group-hover:text-zinc-500 shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: Program Grid or Workout Template Editor ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showWorkoutTemplateEditor ? (
          <WorkoutTemplateEditor
            clubId={activeClubId}
            template={editingWorkoutTemplate}
            exercises={exercises}
            onSaved={handleWorkoutTemplateSaved}
            onCancel={() => { setShowWorkoutTemplateEditor(false); setEditingWorkoutTemplate(null) }}
          />
        ) : (selectedProgramId || showNewProgramForm) ? (
          <ProgramGrid
            programName={programName}
            setProgramName={setProgramName}
            totalWeeks={totalWeeks}
            setTotalWeeks={setTotalWeeks}
            increment={increment}
            setIncrement={setIncrement}
            grid={grid}
            phaseNames={phaseNames}
            setPhaseNames={setPhaseNames}
            workoutTemplates={workoutTemplates}
            onSlotChange={handleSlotChange}
            onSave={handleSave}
            saving={saving}
            saveMessage={saveMessage}
            isNew={!selectedProgramId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-xs font-mono text-zinc-600 uppercase">
                Select a program to edit
              </p>
              <p className="text-[10px] font-mono text-zinc-700">
                or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Program Grid ──────────────────────────────────────────────

function ProgramGrid({
  programName,
  setProgramName,
  totalWeeks,
  setTotalWeeks,
  increment,
  setIncrement,
  grid,
  phaseNames,
  setPhaseNames,
  workoutTemplates,
  onSlotChange,
  onSave,
  saving,
  saveMessage,
  isNew,
}: {
  programName: string
  setProgramName: (v: string) => void
  totalWeeks: number
  setTotalWeeks: (v: number) => void
  increment: number
  setIncrement: (v: number) => void
  grid: Record<string, Record<number, string | null>>
  phaseNames: Record<number, string>
  setPhaseNames: (fn: (prev: Record<number, string>) => Record<number, string>) => void
  workoutTemplates: WorkoutTemplate[]
  onSlotChange: (week: number, day: number, templateId: string | null) => void
  onSave: () => void
  saving: boolean
  saveMessage: string | null
  isNew: boolean
}) {
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(new Set())

  const toggleWeek = (weekNum: number) => {
    setCollapsedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekNum)) next.delete(weekNum)
      else next.add(weekNum)
      return next
    })
  }

  const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Grid header bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 gap-4">
        <input
          type="text"
          value={programName}
          onChange={(e) => setProgramName(e.target.value)}
          placeholder="PROGRAM NAME"
          className="
            flex-1 bg-transparent text-sm font-bold uppercase tracking-tight text-zinc-100
            border-b border-transparent focus:border-zinc-700 focus:outline-none
            transition-colors pb-0.5 placeholder:text-zinc-700
          "
        />

        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Weeks</span>
            <input
              type="number"
              min={1}
              max={52}
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(Math.max(1, Math.min(52, Number(e.target.value))))}
              className="
                w-12 bg-zinc-900 border border-zinc-800 text-xs text-zinc-200
                text-center p-1 focus:outline-none focus:border-zinc-600
              "
            />
          </label>

          <label className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Round</span>
            <select
              value={increment}
              onChange={(e) => setIncrement(Number(e.target.value))}
              className="
                bg-zinc-900 border border-zinc-800 text-xs text-zinc-200
                p-1 focus:outline-none focus:border-zinc-600
              "
            >
              {[1, 2.5, 5, 10].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>

          {saveMessage && (
            <span className={`text-[10px] font-mono uppercase ${saveMessage.startsWith('Error') ? 'text-red-500' : 'text-green-400'}`}>
              {saveMessage}
            </span>
          )}

          <button
            onClick={onSave}
            disabled={saving}
            className="
              flex items-center gap-1.5
              px-3 py-1.5 bg-white text-black
              text-[10px] font-bold uppercase tracking-widest
              hover:bg-zinc-200 disabled:opacity-50
              transition-colors
            "
          >
            <Save size={10} />
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="shrink-0 grid border-b border-zinc-800 bg-zinc-900" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
        <div className="px-3 py-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest border-r border-zinc-800">
          Week
        </div>
        {DAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center border-r border-zinc-800 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="flex-1 overflow-y-auto">
        {weekNumbers.map((weekNum) => {
          const isCollapsed = collapsedWeeks.has(weekNum)
          const phaseName = phaseNames[weekNum] ?? ''
          const sessionCount = DAYS.filter(
            (_, di) => grid[weekNum]?.[di]
          ).length

          return (
            <div key={weekNum} className="border-b border-zinc-900">
              {/* Week row header */}
              <div
                className="grid border-b border-zinc-900 bg-zinc-950/50 hover:bg-zinc-900/30 transition-colors"
                style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}
              >
                {/* Week label + collapse toggle */}
                <div className="px-3 py-2 flex items-center gap-2 border-r border-zinc-800">
                  <button
                    onClick={() => toggleWeek(weekNum)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {isCollapsed
                      ? <ChevronRight size={12} />
                      : <ChevronDown size={12} />
                    }
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold font-mono text-zinc-300 uppercase shrink-0">
                        W{weekNum}
                      </span>
                      <input
                        type="text"
                        value={phaseName}
                        onChange={(e) =>
                          setPhaseNames((prev) => ({ ...prev, [weekNum]: e.target.value }))
                        }
                        placeholder="Phase name..."
                        onClick={(e) => e.stopPropagation()}
                        className="
                          flex-1 min-w-0 bg-transparent text-[10px] font-mono text-zinc-600
                          focus:text-zinc-300 focus:outline-none
                          placeholder:text-zinc-800
                          border-b border-transparent focus:border-zinc-700
                          transition-colors
                        "
                      />
                    </div>
                    {!isCollapsed && (
                      <span className="text-[9px] font-mono text-zinc-700">
                        {sessionCount} session{sessionCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Day slots — collapsed shows summary pills */}
                {DAYS.map((_, dayIdx) => {
                  const assignedId = grid[weekNum]?.[dayIdx] ?? null
                  const assigned = workoutTemplates.find((wt) => wt.id === assignedId)

                  if (isCollapsed) {
                    return (
                      <div key={dayIdx} className="px-1 py-2 flex items-center justify-center border-r border-zinc-900 last:border-r-0">
                        {assigned ? (
                          <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 truncate max-w-full">
                            {assigned.name}
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-800">—</span>
                        )}
                      </div>
                    )
                  }

                  return (
                    <SlotCell
                      key={dayIdx}
                      weekNum={weekNum}
                      dayIdx={dayIdx}
                      assigned={assigned ?? null}
                      workoutTemplates={workoutTemplates}
                      onChange={(id) => onSlotChange(weekNum, dayIdx, id)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Slot Cell ─────────────────────────────────────────────────

function SlotCell({
  weekNum,
  dayIdx,
  assigned,
  workoutTemplates,
  onChange,
}: {
  weekNum: number
  dayIdx: number
  assigned: WorkoutTemplate | null
  workoutTemplates: WorkoutTemplate[]
  onChange: (id: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative border-r border-zinc-900 last:border-r-0 min-h-[72px]">
      <button
        onClick={() => setOpen(!open)}
        className={`
          w-full h-full min-h-[72px] p-2 text-left
          transition-colors
          ${assigned ? 'bg-zinc-900 hover:bg-zinc-800' : 'hover:bg-zinc-900/30'}
        `}
      >
        {assigned ? (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-zinc-200 leading-tight line-clamp-2">
              {assigned.name}
            </p>
            <p className="text-[9px] font-mono text-zinc-600">
              {assigned.workout_template_exercises.length} ex
            </p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <Plus size={10} className="text-zinc-800" />
          </div>
        )}
      </button>

      {/* Dropdown to pick a workout template */}
      {open && (
        <div className="absolute top-full left-0 z-50 w-48 bg-zinc-900 border border-zinc-700 shadow-xl">
          <button
            onClick={() => { onChange(null); setOpen(false) }}
            className="w-full text-left px-3 py-2 text-[10px] font-mono text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors border-b border-zinc-800"
          >
            — Rest day
          </button>
          {workoutTemplates.map((wt) => (
            <button
              key={wt.id}
              onClick={() => { onChange(wt.id); setOpen(false) }}
              className={`
                w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-zinc-800 transition-colors
                ${assigned?.id === wt.id ? 'text-white bg-zinc-800' : 'text-zinc-300'}
              `}
            >
              <p className="truncate">{wt.name}</p>
              <p className="text-[9px] text-zinc-600 mt-0.5">
                {wt.workout_template_exercises.length} exercises
              </p>
            </button>
          ))}
          {workoutTemplates.length === 0 && (
            <p className="px-3 py-2 text-[10px] font-mono text-zinc-700">
              No workout templates yet.
            </p>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────

function buildGrid(program: Program | null): Record<string, Record<number, string | null>> {
  if (!program) return {}
  const grid: Record<string, Record<number, string | null>> = {}
  for (const week of program.program_weeks) {
    grid[week.week_number] = {}
    for (const slot of week.program_week_slots) {
      grid[week.week_number][slot.day_index] = slot.workout_template_id
    }
  }
  return grid
}

function buildPhaseNames(program: Program | null): Record<number, string> {
  if (!program) return {}
  const names: Record<number, string> = {}
  for (const week of program.program_weeks) {
    if (week.phase_name) names[week.week_number] = week.phase_name
  }
  return names
}
