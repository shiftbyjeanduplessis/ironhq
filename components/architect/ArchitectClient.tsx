'use client'
// components/architect/ArchitectClient.tsx
// Owns all local state for the builder session.
// Orchestrates DnD context across the 3 panes.

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import ExerciseLibrary from './ExerciseLibrary'
import WorkoutBuilder from './WorkoutBuilder'
import InspectorPanel from './InspectorPanel'

export type Exercise = {
  id: string
  name: string
  category: string
  method: string
}

export type PlannedExercise = Exercise & {
  instanceId: string
  sets: number
  reps: number
  load: number
}

export type Athlete = {
  id: string
  display_name: string
  email: string
}

type Props = {
  initialExercises: Exercise[]
  athletes: Athlete[]
  activeClubId: string
  activeClubName: string
}

export default function ArchitectClient({
  initialExercises,
  athletes,
  activeClubId,
}: Props) {
  const [plannedExercises, setPlannedExercises] = useState<PlannedExercise[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [workoutTitle, setWorkoutTitle] = useState('UNTITLED SESSION')

  // Use PointerSensor to avoid interfering with inputs
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    // Drag from library → builder (drop on zone or on an existing card)
    if (active.data.current?.type === 'LibraryItem') {
      const exercise = active.data.current.exercise as Exercise
      const newBlock: PlannedExercise = {
        ...exercise,
        instanceId: crypto.randomUUID(),
        sets: 3,
        reps: 5,
        load: 0,
      }

      setPlannedExercises((prev) => {
        // Dropped on the empty zone label
        if (over.id === 'workout-builder-dropzone') {
          return [...prev, newBlock]
        }
        // Dropped on an existing card — insert at that position
        const overIndex = prev.findIndex((ex) => ex.instanceId === over.id)
        if (overIndex === -1) return [...prev, newBlock]
        const next = [...prev]
        next.splice(overIndex, 0, newBlock)
        return next
      })
      return
    }

    // Reorder within builder
    if (
      active.data.current?.type === 'PlannedItem' &&
      over.data.current?.type === 'PlannedItem' &&
      active.id !== over.id
    ) {
      setPlannedExercises((items) => {
        const oldIndex = items.findIndex((i) => i.instanceId === active.id)
        const newIndex = items.findIndex((i) => i.instanceId === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const updatePlannedExercise = (
    instanceId: string,
    updates: Partial<PlannedExercise>
  ) => {
    setPlannedExercises((prev) =>
      prev.map((ex) =>
        ex.instanceId === instanceId ? { ...ex, ...updates } : ex
      )
    )
  }

  const removePlannedExercise = (instanceId: string) => {
    setPlannedExercises((prev) =>
      prev.filter((ex) => ex.instanceId !== instanceId)
    )
    if (selectedInstanceId === instanceId) setSelectedInstanceId(null)
  }

  const clearBuilder = () => {
    setPlannedExercises([])
    setWorkoutTitle('UNTITLED SESSION')
    setSelectedInstanceId(null)
  }

  const selectedExercise =
    plannedExercises.find((ex) => ex.instanceId === selectedInstanceId) ?? null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <main className="flex-1 grid grid-cols-12 h-[calc(100vh-3rem)] overflow-hidden">
        {/* LEFT: Exercise Library */}
        <div className="col-span-3 border-r border-zinc-800 flex flex-col h-full bg-zinc-950">
          <ExerciseLibrary exercises={initialExercises} />
        </div>

        {/* CENTER: Workout Builder */}
        <div className="col-span-6 flex flex-col h-full bg-[#0a0a0c]">
          <SortableContext
            items={plannedExercises.map((e) => e.instanceId)}
            strategy={verticalListSortingStrategy}
          >
            <WorkoutBuilder
              workoutTitle={workoutTitle}
              setWorkoutTitle={setWorkoutTitle}
              plannedExercises={plannedExercises}
              selectedInstanceId={selectedInstanceId}
              onSelect={setSelectedInstanceId}
              onRemove={removePlannedExercise}
            />
          </SortableContext>
        </div>

        {/* RIGHT: Inspector + Assignment */}
        <div className="col-span-3 border-l border-zinc-800 flex flex-col h-full bg-zinc-950">
          <InspectorPanel
            activeClubId={activeClubId}
            workoutTitle={workoutTitle}
            selectedExercise={selectedExercise}
            updateExercise={updatePlannedExercise}
            athletes={athletes}
            plannedExercises={plannedExercises}
            onSuccessClear={clearBuilder}
          />
        </div>
      </main>
    </DndContext>
  )
}
