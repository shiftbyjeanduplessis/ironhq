'use client'
// components/logger/NoticeWall.tsx
// Gates the logger behind an unacknowledged required notice.

type Notice = {
  id: string
  title: string
  body: string
  priority: string
  requires_acknowledgement: boolean
}

export default function NoticeWall({
  notice,
  onAcknowledge,
}: {
  notice: Notice
  onAcknowledge: () => void
}) {
  return (
    <main className="flex-1 flex flex-col p-4">
      <div
        className={`
          border p-5 space-y-4
          ${notice.priority === 'urgent' ? 'border-red-800 bg-red-950/20' : 'border-zinc-800 bg-zinc-900'}
        `}
      >
        {notice.priority === 'urgent' && (
          <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest">
            Urgent Notice
          </span>
        )}
        <h2 className="text-base font-bold uppercase tracking-tight text-zinc-100">
          {notice.title}
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{notice.body}</p>

        {notice.requires_acknowledgement && (
          <button
            onClick={onAcknowledge}
            className="
              w-full py-3
              bg-white text-black
              text-xs font-bold uppercase tracking-widest
              hover:bg-zinc-200
              transition-colors mt-2
            "
          >
            I Understand — Continue
          </button>
        )}
      </div>
    </main>
  )
}
