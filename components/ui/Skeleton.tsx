// components/ui/Skeleton.tsx
// Reusable skeleton block for loading states.
// Uses animate-pulse-soft from tailwind config.

export function Skeleton({
  className = '',
}: {
  className?: string
}) {
  return (
    <div
      className={`bg-zinc-800 animate-pulse ${className}`}
      aria-hidden="true"
    />
  )
}

// Row of skeleton cells — for table loading states
export function SkeletonRow({ cols }: { cols: number[] }) {
  return (
    <div className="flex gap-4 px-4 py-3 border-b border-zinc-900">
      {cols.map((w, i) => (
        <Skeleton key={i} className={`h-3 rounded-none`} style={{ width: `${w}%` } as React.CSSProperties} />
      ))}
    </div>
  )
}

// Card skeleton
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 rounded-none ${i === 0 ? 'w-1/2' : i === lines - 1 ? 'w-1/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}
