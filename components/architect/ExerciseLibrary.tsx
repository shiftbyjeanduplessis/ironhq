'use client'
// components/architect/ExerciseLibrary.tsx

import { useState, useMemo } from 'react'
import ExerciseRow from './ExerciseRow'
import type { Exercise } from './ArchitectClient'

const CATEGORIES = [
  'all', 'squat', 'bench', 'hinge', 'press', 'pull',
  'olympic_lift', 'accessory', 'power', 'conditioning',
]

export default function ExerciseLibrary({
  exercises,
}: {
  exercises: Exercise[]
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        ex.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        activeCategory === 'all' || ex.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [exercises, search, activeCategory])

  return (
    <>
      <div className="p-3 border-b border-zinc-800 shrink-0 space-y-2">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Exercise Library
        </h2>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full bg-zinc-900 border border-zinc-800
            text-xs text-zinc-100 p-2
            focus:outline-none focus:border-zinc-600
            transition-colors placeholder:text-zinc-600
          "
        />
        {/* Category filter chips */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`
                text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border
                transition-colors
                ${
                  activeCategory === cat
                    ? 'border-white text-white bg-white/10'
                    : 'border-zinc-800 text-zinc-600 hover:border-zinc-600'
                }
              `}
            >
              {cat === 'all' ? 'ALL' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-[10px] text-zinc-600 font-mono uppercase p-2">
            No exercises found
          </p>
        ) : (
          filtered.map((ex) => <ExerciseRow key={ex.id} exercise={ex} />)
        )}
      </div>
    </>
  )
}
