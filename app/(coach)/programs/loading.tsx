// app/(coach)/programs/loading.tsx
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function ProgramsLoading() {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar list */}
      <div className="w-72 border-r border-zinc-800 p-4 space-y-3">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
      {/* Grid area */}
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-6" />
          ))}
          {Array.from({ length: 28 }).map((_, i) => (
            <Skeleton key={i + 7} className="h-20" />
          ))}
        </div>
      </div>
    </div>
  )
}
