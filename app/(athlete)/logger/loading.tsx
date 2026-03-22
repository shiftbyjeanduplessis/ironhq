// app/(athlete)/logger/loading.tsx
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function LoggerLoading() {
  return (
    <main className="flex-1 flex flex-col overflow-y-auto">
      <section className="p-4 border-b border-zinc-800">
        <Skeleton className="h-2.5 w-16 mb-4" />
        <div className="border border-zinc-800">
          <div className="p-4 border-b border-zinc-800 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-2.5 w-32" />
          </div>
          <div className="divide-y divide-zinc-800">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-2 flex justify-between">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
          <div className="p-4">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </section>
      <section className="p-4 space-y-2">
        <Skeleton className="h-2.5 w-20 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </section>
    </main>
  )
}
