'use client'
// components/comms/CommsClient.tsx
// Two-tab layout: Notices | Messages
// Notices tab: create, view, see acknowledgement count
// Messages tab: conversation list + active thread

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import MessageThread from './MessageThread'

// ── Types ─────────────────────────────────────────────────────

type Acknowledgement = {
  id: string
  profile_id: string
  acknowledged_at: string
}

type Notice = {
  id: string
  title: string
  body: string
  priority: string
  requires_acknowledgement: boolean
  published_at: string
  created_by_profile_id: string
  notice_acknowledgements: Acknowledgement[]
}

type Participant = {
  profile_id: string
  profiles: { id: string; display_name: string | null; email: string }
}

type Message = {
  id: string
  body: string
  created_at: string
  sender_profile_id: string
}

type Conversation = {
  id: string
  conversation_type: string
  conversation_participants: Participant[]
  messages: Message[]
}

type Props = {
  activeClubId: string
  coachProfileId: string
  notices: Notice[]
  athleteCount: number
  conversations: Conversation[]
  activeTab: 'notices' | 'messages'
}

// ── Main ──────────────────────────────────────────────────────

export default function CommsClient({
  activeClubId,
  coachProfileId,
  notices: initialNotices,
  athleteCount,
  conversations: initialConversations,
  activeTab: initialTab,
}: Props) {
  const [tab, setTab] = useState<'notices' | 'messages'>(initialTab)
  const [notices, setNotices] = useState<Notice[]>(initialNotices)
  const [conversations] = useState<Conversation[]>(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  const handleTabChange = (t: 'notices' | 'messages') => {
    setTab(t)
    router.push(`${pathname}?clubId=${activeClubId}&tab=${t}`, { scroll: false })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="shrink-0 flex border-b border-zinc-800 bg-zinc-900">
        {(['notices', 'messages'] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`
              px-6 py-3 text-[10px] font-mono uppercase tracking-widest
              border-r border-zinc-800 transition-colors
              ${
                tab === t
                  ? 'text-white border-b-2 border-b-white bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-300'
              }
            `}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'notices' ? (
        <NoticesTab
          notices={notices}
          athleteCount={athleteCount}
          activeClubId={activeClubId}
          coachProfileId={coachProfileId}
          onNoticeCreated={(n) => setNotices([n, ...notices])}
        />
      ) : (
        <MessagesTab
          conversations={conversations}
          coachProfileId={coachProfileId}
          activeClubId={activeClubId}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
        />
      )}
    </div>
  )
}

// ── Notices Tab ────────────────────────────────────────────────

function NoticesTab({
  notices,
  athleteCount,
  activeClubId,
  coachProfileId,
  onNoticeCreated,
}: {
  notices: Notice[]
  athleteCount: number
  activeClubId: string
  coachProfileId: string
  onNoticeCreated: (n: Notice) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [requiresAck, setRequiresAck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { data, error: dbError } = await supabase
      .from('notices')
      .insert({
        club_id: activeClubId,
        created_by_profile_id: coachProfileId,
        title: title.trim(),
        body: body.trim(),
        priority,
        requires_acknowledgement: requiresAck,
      })
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setSubmitting(false)
      return
    }

    onNoticeCreated({ ...data, notice_acknowledgements: [] })
    setTitle('')
    setBody('')
    setPriority('normal')
    setRequiresAck(false)
    setShowForm(false)
    setSubmitting(false)
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Notice list */}
      <div className={`flex flex-col overflow-hidden ${showForm ? 'w-1/2' : 'w-full'}`}>
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {notices.length} Notice{notices.length !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="
              text-[10px] font-mono uppercase tracking-widest
              border border-zinc-700 text-zinc-400 px-3 py-1.5
              hover:border-white hover:text-white
              transition-colors
            "
          >
            {showForm ? '✕ Cancel' : '+ New Notice'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {notices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs font-mono text-zinc-600 uppercase">No notices yet.</p>
            </div>
          ) : (
            notices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                athleteCount={athleteCount}
              />
            ))
          )}
        </div>
      </div>

      {/* Create notice form */}
      {showForm && (
        <div className="w-1/2 border-l border-zinc-800 flex flex-col bg-zinc-950">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest">
              New Notice
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New Training Block Starts Monday"
                className="
                  w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 p-3
                  focus:outline-none focus:border-zinc-500 transition-colors
                  placeholder:text-zinc-700
                "
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Write your message to the club..."
                className="
                  w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 p-3
                  focus:outline-none focus:border-zinc-500 transition-colors resize-none
                  placeholder:text-zinc-700
                "
              />
            </div>

            <div className="flex gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
                  className="
                    bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 p-2
                    focus:outline-none focus:border-zinc-500 transition-colors
                  "
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                  Requires Ack
                </label>
                <button
                  onClick={() => setRequiresAck(!requiresAck)}
                  className={`
                    text-[10px] font-mono uppercase tracking-widest
                    border px-3 py-2 transition-colors
                    ${requiresAck
                      ? 'border-white text-white bg-white/10'
                      : 'border-zinc-700 text-zinc-600'}
                  `}
                >
                  {requiresAck ? '✓ Required' : 'Optional'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[10px] font-mono text-red-500 uppercase">{error}</p>
            )}
          </div>

          <div className="shrink-0 p-4 border-t border-zinc-800">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="
                w-full py-3 bg-white text-black
                text-xs font-bold uppercase tracking-widest
                hover:bg-zinc-200 disabled:opacity-50 transition-colors
              "
            >
              {submitting ? 'Publishing...' : 'Publish Notice'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NoticeCard({
  notice,
  athleteCount,
}: {
  notice: Notice
  athleteCount: number
}) {
  const ackCount = notice.notice_acknowledgements?.length ?? 0

  return (
    <div
      className={`
        p-4 space-y-2
        ${notice.priority === 'urgent' ? 'border-l-2 border-l-red-600' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {notice.priority === 'urgent' && (
            <span className="text-[9px] font-mono text-red-500 uppercase tracking-widest block mb-1">
              Urgent
            </span>
          )}
          <p className="text-sm font-bold uppercase tracking-tight text-zinc-100 truncate">
            {notice.title}
          </p>
          <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
            {new Date(notice.published_at).toLocaleDateString('en-ZA', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </p>
        </div>
        {notice.requires_acknowledgement && (
          <span className="text-[9px] font-mono text-zinc-500 shrink-0 border border-zinc-800 px-1.5 py-0.5">
            {ackCount}/{athleteCount} acked
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{notice.body}</p>
    </div>
  )
}

// ── Messages Tab ───────────────────────────────────────────────

function MessagesTab({
  conversations,
  coachProfileId,
  activeClubId,
  activeConversationId,
  onSelectConversation,
}: {
  conversations: Conversation[]
  coachProfileId: string
  activeClubId: string
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
}) {
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  const getOtherParticipant = (conv: Conversation) => {
    const others = conv.conversation_participants.filter(
      (p) => p.profile_id !== coachProfileId
    )
    return others[0]?.profiles
  }

  const getLastMessage = (conv: Conversation) => {
    if (!conv.messages || conv.messages.length === 0) return null
    return [...conv.messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Conversation list */}
      <div className="w-64 border-r border-zinc-800 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-zinc-800">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Direct Messages
          </p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[10px] font-mono text-zinc-700 uppercase">
                No conversations yet.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = getOtherParticipant(conv)
              const last = getLastMessage(conv)
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`
                    w-full text-left px-4 py-3 transition-colors
                    ${
                      activeConversationId === conv.id
                        ? 'bg-zinc-800'
                        : 'hover:bg-zinc-900/50'
                    }
                  `}
                >
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {other?.display_name ?? other?.email ?? 'Unknown'}
                  </p>
                  {last && (
                    <p className="text-[10px] font-mono text-zinc-600 truncate mt-0.5">
                      {last.body}
                    </p>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeConversation ? (
          <MessageThread
            conversation={activeConversation}
            currentProfileId={coachProfileId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs font-mono text-zinc-700 uppercase">
              Select a conversation
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
