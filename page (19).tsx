// app/(admin)/layout.tsx
// Admin shell — utilitarian, minimal. Distinct from coach shell.

import Link from 'next/link'
import { BarChart2, Users, Building2, Terminal } from 'lucide-react'

const NAV = [
  { href: '/admin',          label: 'Overview', Icon: BarChart2  },
  { href: '/admin/clubs',    label: 'Clubs',    Icon: Building2  },
  { href: '/admin/profiles', label: 'Profiles', Icon: Users      },
  { href: '/admin/logs',     label: 'Logs',     Icon: Terminal   },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-50 overflow-hidden font-mono">
      {/* Sidebar */}
      <nav className="w-48 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950">
        <div className="px-4 py-4 border-b border-zinc-800">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">IronHQ</p>
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest mt-0.5">
            Admin
          </p>
        </div>
        <div className="flex-1 py-2">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="
                flex items-center gap-3 px-4 py-2.5
                text-[11px] text-zinc-500 uppercase tracking-widest
                hover:text-white hover:bg-zinc-900
                transition-colors
              "
            >
              <Icon size={13} strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-zinc-800">
          <Link
            href="/architect"
            className="text-[10px] text-zinc-700 hover:text-zinc-500 uppercase tracking-widest transition-colors"
          >
            ← Back to app
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
