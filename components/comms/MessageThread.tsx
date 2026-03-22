'use client'
// components/comms/MessageThread.tsx
// Real-time message thread using Supabase Realtime subscriptions.
// New messages appear instantly without refresh.
// Sends via direct insert (RLS policy validates club membership).

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

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

export default function MessageThread({
  conversation,
  currentProfileId,
}: {
  conversation: Conversation
  currentProfileId: string
}) {
  const [messages, setMessages] = useState<Message[]>(
    [...(conversation.messages ?? [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  )
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            // Avoid duplicates from optimistic adds
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversation.id])

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!body.trim() || sending) return

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      body: body.trim(),
      created_at: new Date().toISOString(),
      sender_profile_id: currentProfileId,
    }

    setSending(true)
    setMessages((prev) => [...prev, optimisticMsg])
    setBody('')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_profile_id: currentProfileId,
        body: optimisticMsg.body,
      })
      .select()
      .single()

    if (error) {
      // Roll back optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setBody(optimisticMsg.body)
      alert(`Failed to send: ${error.message}`)
    } else {
      // Replace temp with real
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? data : m))
      )
    }

    setSending(false)
  }

  const getParticipantName = (profileId: string) => {
    const p = conversation.conversation_participants.find(
      (cp) => cp.profile_id === profileId
    )
    return p?.profiles?.display_name ?? p?.profiles?.email ?? 'Unknown'
  }

  const otherParticipant = conversation.conversation_participants.find(
    (p) => p.profile_id !== currentProfileId
  )

  return (
    <>
      {/* Thread header */}
      <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <p className="text-xs font-medium text-zinc-200">
          {otherParticipant?.profiles?.display_name ??
            otherParticipant?.profiles?.email ??
            'Conversation'}
        </p>
        <p className="text-[10px] font-mono text-zinc-600 mt-0.5 uppercase tracking-widest">
          Direct Message
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-[10px] font-mono text-zinc-700 uppercase text-center py-8">
            No messages yet. Say something.
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_profile_id === currentProfileId
          return (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}
            >
              {!isMe && (
                <span className="text-[9px] font-mono text-zinc-600 uppercase px-1">
                  {getParticipantName(msg.sender_profile_id)}
                </span>
              )}
              <div
                className={`
                  max-w-[75%] px-3 py-2 text-xs leading-relaxed
                  ${
                    isMe
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }
                  ${msg.id.startsWith('temp-') ? 'opacity-60' : ''}
                `}
              >
                {msg.body}
              </div>
              <span className="text-[9px] font-mono text-zinc-700 px-1">
                {new Date(msg.created_at).toLocaleTimeString('en-ZA', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 p-3 flex gap-2 bg-zinc-950">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Type a message..."
          className="
            flex-1 bg-zinc-900 border border-zinc-800 text-sm text-zinc-100
            px-3 py-2
            focus:outline-none focus:border-zinc-600
            transition-colors placeholder:text-zinc-700
          "
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="
            px-4 py-2 bg-white text-black
            text-xs font-bold uppercase tracking-widest
            hover:bg-zinc-200
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Send
        </button>
      </div>
    </>
  )
}
