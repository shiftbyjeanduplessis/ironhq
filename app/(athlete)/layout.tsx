// app/(athlete)/layout.tsx
// Wraps all athlete routes. Provides bottom tab nav (mobile-first).

import Link from 'next/link'
import { Play, Clock, Users } from 'lucide-react'

// Squad tab is conditionally shown — we render it always in the layout
// and let the squad page handle the "not enabled" state gracefully.
const TABS = [
  { href: '/logger',  label: 'Workout', Icon: Play },
  { href: '/squad',   label: 'Squad',   Icon: Users },
  { href: '/history', label: 'History', Icon: Clock },
]

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <div className="flex-1 flex flex-col overflow-hidden pb-14">
        {children}
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-14 bg-zinc-950 border-t border-zinc-800 flex items-stretch">
        {TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="
              flex-1 flex flex-col items-center justify-center gap-0.5
              text-zinc-600 hover:text-white
              transition-colors
            "
          >
            <Icon size={16} strokeWidth={1.5} />
            <span className="text-[9px] font-mono uppercase tracking-widest">
              {label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
