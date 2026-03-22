'use client'
// components/architect/ClubContextSwitcher.tsx
// Renders a club selector in the header.
// Changing the club pushes a new URL searchParam, triggering
// a server-side refetch with the correct club context.

import { useRouter, usePathname } from 'next/navigation'

type Club = {
  id: string
  name: string
  role: string
}

export default function ClubContextSwitcher({
  activeClubId,
  clubs,
}: {
  activeClubId: string
  clubs: Club[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  // If only one club, show a static label — no dropdown needed
  if (clubs.length <= 1) {
    return (
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
        {clubs[0]?.name}
        {clubs[0]?.role !== 'coach' && ` · ${clubs[0]?.role}`}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
        Club
      </span>
      <select
        value={activeClubId}
        onChange={(e) =>
          router.push(`${pathname}?clubId=${e.target.value}`)
        }
        className="
          bg-zinc-900 border border-zinc-800
          text-xs text-zinc-300 font-mono
          px-2 py-1
          focus:outline-none focus:border-zinc-500
          transition-colors uppercase
        "
      >
        {clubs.map((club) => (
          <option key={club.id} value={club.id}>
            {club.name} ({club.role})
          </option>
        ))}
      </select>
    </div>
  )
}
