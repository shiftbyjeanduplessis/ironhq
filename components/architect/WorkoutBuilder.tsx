'use client'
// components/architect/WorkoutBuilder.tsx

import { useDroppable } from '@dnd-kit/core'
import PlannedExerciseCard from './PlannedExerciseCard'
import type { PlannedExercise } from './ArchitectClient'

type Props = {
  workoutTitle: string
  setWorkoutTitle: (val: string) => void
  plannedExercises: PlannedExercise[]
  selectedInstanceId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

export default function WorkoutBuilder({
  workoutTitle,
  setWorkoutTitle,
  plannedExercises,
  selectedInstanceId,
  onSelect,
  onRemove,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'workout-builder-dropzone' })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Session title */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <input
          type="text"
          value={workoutTitle}
          onChange={(e) => setWorkoutTitle(e.target.value)}
          placeholder="ENTER SESSION TITLE..."
          className="
            w-full bg-transparent
            text-lg font-bold uppercase tracking-tight text-zinc-100
            border-b border-transparent
            focus:outline-none focus:border-zinc-700
            transition-colors pb-0.5
            placeholder:text-zinc-700
          "
        />
        {plannedExercises.length > 0 && (
          <p className="text-[10px] text-zinc-600 font-mono mt-1">
            {plannedExercises.length} exercise{plannedExercises.length !== 1 ? 's' : ''}
            {' · '}
            {plannedExercises.reduce((acc, ex) => acc + ex.sets, 0)} total sets
          </p>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 overflow-y-auto p-4 space-y-2
          transition-colors
          ${isOver && plannedExercises.length === 0 ? 'bg-zinc-900/30' : ''}
        `}
      >
        {plannedExercises.length === 0 ? (
          <div
            className={`
              h-full flex items-center justify-center
              border-2 border-dashed text-zinc-700 text-xs font-mono uppercase
              transition-colors
              ${isOver ? 'border-zinc-600 text-zinc-500' : 'border-zinc-800'}
            `}
          >
            Drag exercises here
          </div>
        ) : (
          plannedExercises.map((ex, index) => (
            <PlannedExerciseCard
              key={ex.instanceId}
              exercise={ex}
              index={index}
              isSelected={selectedInstanceId === ex.instanceId}
              onSelect={() => onSelect(ex.instanceId)}
              onRemove={() => onRemove(ex.instanceId)}
            />
          ))
        )}
      </div>
    </div>
  )
}
