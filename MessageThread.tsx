'use client'
// components/architect/PlannedExerciseCard.tsx

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PlannedExercise } from './ArchitectClient'

type Props = {
  exercise: PlannedExercise
  index: number
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}

export default function PlannedExerciseCard({
  exercise,
  index,
  isSelected,
  onSelect,
  onRemove,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: exercise.instanceId,
      data: { type: 'PlannedItem', exercise },
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`
        border bg-zinc-950 flex flex-col cursor-pointer
        transition-colors
        ${isDragging ? 'opacity-50' : ''}
        ${isSelected ? 'border-white' : 'border-zinc-800 hover:border-zinc-600'}
      `}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-600 hover:text-zinc-400 cursor-grab px-0.5 text-xs"
            aria-label="Drag to reorder"
          >
            ⠿
          </button>
          <span className="text-[10px] text-zinc-600 font-mono">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-xs font-bold uppercase tracking-tight text-zinc-100">
            {exercise.name}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="text-zinc-700 hover:text-red-500 text-xs px-1 transition-colors"
          aria-label="Remove exercise"
        >
          ✕
        </button>
      </div>

      {/* Sets / Reps / Load display */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800 text-center font-mono text-[10px]">
        <div className="py-1.5 px-2">
          <span className="text-zinc-600 mr-1">SETS</span>
          <span className="text-zinc-200">{exercise.sets}</span>
        </div>
        <div className="py-1.5 px-2">
          <span className="text-zinc-600 mr-1">REPS</span>
          <span className="text-zinc-200">{exercise.reps}</span>
        </div>
        <div className="py-1.5 px-2">
          <span className="text-zinc-600 mr-1">LOAD</span>
          <span className="text-zinc-200">{exercise.load}</span>
        </div>
      </div>
    </div>
  )
}
