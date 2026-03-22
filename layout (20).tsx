// app/(athlete)/history/loading.tsx
import { Skeleton } from '@/components/ui/Skeleton'

export default function HistoryLoading() {
  return (
    <main className="flex-1 flex flex-col overflow-y-auto">
      <section className="p-4 border-b border-zinc-800">
        <Skeleton className="h-2.5 w-24 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-32 mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="p-4 space-y-2">
        <Skeleton className="h-2.5 w-16 mb-3" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border border-zinc-800 px-4 py-3 flex justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </section>
    </main>
  )
}
