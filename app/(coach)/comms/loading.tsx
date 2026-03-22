// app/(coach)/comms/loading.tsx
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function CommsLoading() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar skeleton */}
      <div className="shrink-0 flex border-b border-zinc-800 bg-zinc-900">
        <Skeleton className="h-10 w-24 m-2" />
        <Skeleton className="h-10 w-24 m-2" />
      </div>
      {/* Content */}
      <div className="flex-1 p-4 space-y-3">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-28" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  )
}
