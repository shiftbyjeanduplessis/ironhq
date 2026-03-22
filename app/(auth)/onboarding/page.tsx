'use client'
// app/(auth)/onboarding/page.tsx
// Called after a new user authenticates via magic link with an invite token.
// Calls redeem_invite RPC to activate membership and create profiles.
// useSearchParams requires a Suspense boundary in Next.js App Router.

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Step = 'loading' | 'form' | 'success' | 'error'

// Inner component uses useSearchParams — must be wrapped in Suspense
function OnboardingInner() {
  const [step, setStep] = useState<Step>('loading')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const token = searchParams.get('invite_token')
    if (!token) {
      // No token — check if user is already onboarded
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) { router.replace('/login'); return }
        supabase
          .from('profiles')
          .select('primary_role, is_active')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.is_active && data?.primary_role) {
              router.replace(data.primary_role === 'coach' ? '/architect' : '/logger')
            } else {
              setStep('error')
              setErrorMsg('No invite token found and profile is not set up. Contact your coach.')
            }
          })
      })
      return
    }
    setInviteToken(token)
    setStep('form')
  }, [searchParams])

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('ENTER YOUR FIRST AND LAST NAME')
      return
    }
    if (!inviteToken) return

    setSubmitting(true)
    setErrorMsg('')

    const { error } = await supabase.rpc('redeem_invite', {
      p_token: inviteToken,
      p_first_name: firstName.trim(),
      p_last_name: lastName.trim(),
    })

    if (error) {
      setErrorMsg(error.message.toUpperCase())
      setSubmitting(false)
      return
    }

    // Refresh session so primary_role is current
    await supabase.auth.refreshSession()

    setStep('success')
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_role')
        .eq('id', user.id)
        .single()
      router.replace(profile?.primary_role === 'coach' ? '/architect' : '/logger')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase text-zinc-100">
            IronHQ
          </h1>
          <p className="text-xs text-zinc-600 font-mono mt-1 uppercase tracking-widest">
            Account Setup
          </p>
        </div>

        {step === 'loading' && (
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
            Verifying...
          </p>
        )}

        {step === 'form' && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500 font-mono">
              You have been invited to IronHQ. Enter your name to activate your account.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Alex"
                className="
                  w-full bg-zinc-900 border border-zinc-800
                  text-sm text-zinc-100 p-3
                  focus:outline-none focus:border-zinc-500
                  transition-colors placeholder:text-zinc-700
                "
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Garland"
                className="
                  w-full bg-zinc-900 border border-zinc-800
                  text-sm text-zinc-100 p-3
                  focus:outline-none focus:border-zinc-500
                  transition-colors placeholder:text-zinc-700
                "
              />
            </div>

            {errorMsg && (
              <p className="text-[10px] font-mono text-red-500 uppercase">
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="
                w-full py-3
                bg-white text-black
                text-xs font-bold uppercase tracking-widest
                hover:bg-zinc-200
                disabled:opacity-50
                transition-colors
              "
            >
              {submitting ? 'ACTIVATING...' : 'ACTIVATE ACCOUNT'}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="border border-green-900 bg-green-950/20 p-4">
            <p className="text-xs font-mono text-green-400 uppercase tracking-widest">
              Account activated. Redirecting...
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="border border-red-900 bg-red-950/20 p-4 space-y-2">
            <p className="text-xs font-mono text-red-400 uppercase tracking-widest">
              Error
            </p>
            <p className="text-xs text-zinc-500 font-mono">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Suspense wrapper — required because OnboardingInner uses useSearchParams
export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            Loading...
          </p>
        </div>
      }
    >
      <OnboardingInner />
    </Suspense>
  )
}
