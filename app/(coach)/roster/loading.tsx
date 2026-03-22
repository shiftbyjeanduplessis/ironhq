// app/(coach)/roster/loading.tsx
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'

export default function RosterLoading() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 grid grid-cols-12 border-b border-zinc-800 bg-zinc-900 px-4 py-2 gap-4">
        {[25, 15, 8, 8, 8, 15, 15].map((w, i) => (
          <Skeleton key={i} className="h-2.5" style={{ gridColumn: `span ${[3,2,1,1,1,2,2][i]}`, width: `${w * 4}px` } as React.CSSProperties} />
        ))}
      </div>
      <div className="flex-1 overflow-hidden divide-y divide-zinc-900">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} cols={[25, 12, 6, 6, 6, 15, 12]} />
        ))}
      </div>
    </div>
  )
}
