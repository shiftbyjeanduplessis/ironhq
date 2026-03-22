// app/(coach)/layout.tsx
// Coach shell layout with sidebar nav.
// Uses lucide-react icons — already in package.json.

import Link from 'next/link'
import { LayoutGrid, Users, MessageSquare, Dumbbell, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/architect', label: 'Architect', Icon: LayoutGrid },
  { href: '/programs',  label: 'Programs',  Icon: Dumbbell },
  { href: '/roster',    label: 'Roster',    Icon: Users },
  { href: '/comms',     label: 'Comms',     Icon: MessageSquare },
  { href: '/settings',  label: 'Settings',  Icon: Settings },
]

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <nav className="w-14 shrink-0 border-r border-zinc-800 flex flex-col items-center pt-3 pb-4 gap-1 bg-zinc-950">
        {/* Wordmark */}
        <div className="w-full flex items-center justify-center h-10 mb-2 border-b border-zinc-800">
          <span className="text-[9px] font-bold font-mono tracking-tighter text-zinc-500 uppercase">
            IHQ
          </span>
        </div>

        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} />
        ))}
      </nav>

      {/* Page content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function NavItem({
  href,
  label,
  Icon,
}: {
  href: string
  label: string
  Icon: React.FC<{ size?: number; strokeWidth?: number }>
}) {
  return (
    <Link
      href={href}
      title={label}
      className="
        group w-10 h-10 flex flex-col items-center justify-center gap-0.5
        text-zinc-600 hover:text-white hover:bg-zinc-800
        transition-colors
        border border-transparent hover:border-zinc-700
      "
    >
      <Icon size={15} strokeWidth={1.5} />
      <span className="text-[8px] font-mono uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity leading-none">
        {label}
      </span>
    </Link>
  )
}
