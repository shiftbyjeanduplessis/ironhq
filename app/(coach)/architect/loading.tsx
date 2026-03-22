// app/(coach)/architect/loading.tsx
import { Skeleton } from '@/components/ui/Skeleton'

export default function ArchitectLoading() {
  return (
    <div className="flex-1 grid grid-cols-12 h-[calc(100vh-3rem)] overflow-hidden">
      {/* Library pane */}
      <div className="col-span-3 border-r border-zinc-800 p-3 space-y-2">
        <Skeleton className="h-3 w-24 mb-4" />
        <Skeleton className="h-8 w-full" />
        <div className="flex gap-1 flex-wrap mt-2">
          {[60, 45, 55, 70, 40].map((w, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${w}px` } as React.CSSProperties} />
          ))}
        </div>
        <div className="space-y-1 mt-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>

      {/* Builder pane */}
      <div className="col-span-6 border-r border-zinc-800 p-4 space-y-3">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-900">
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Inspector pane */}
      <div className="col-span-3 p-4 space-y-4">
        <Skeleton className="h-3 w-24" />
        <div className="space-y-3 mt-6">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="col-span-2 h-12" />
        </div>
        <div className="mt-auto space-y-3 pt-8">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}
