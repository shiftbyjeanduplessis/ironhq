'use client'
// components/architect/ExerciseRow.tsx

import { useDraggable } from '@dnd-kit/core'
import type { Exercise } from './ArchitectClient'

export default function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib-${exercise.id}`,
    data: { type: 'LibraryItem', exercise },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        p-2 border border-zinc-800 bg-zinc-900
        cursor-grab active:cursor-grabbing
        hover:border-zinc-600
        transition-colors
        flex items-center justify-between gap-2
        ${isDragging ? 'opacity-40 border-zinc-700' : ''}
      `}
    >
      <span className="text-xs font-medium text-zinc-100 truncate">
        {exercise.name}
      </span>
      <span className="text-[9px] text-zinc-500 uppercase tracking-wider shrink-0 bg-zinc-950 border border-zinc-800 px-1">
        {exercise.category?.replace('_', ' ')}
      </span>
    </div>
  )
}
