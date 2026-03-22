'use client'
// app/(auth)/login/page.tsx
// Three sign-in options: Google OAuth, Apple OAuth, email + password.
// Coach-initiated flow: athletes arrive via invite link in welcome email.

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const supabase = createClient()
  const router   = useRouter()

  const handleGoogle = async () => {
    setLoading('google'); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(null) }
  }

  const handleApple = async () => {
    setLoading('apple'); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(null) }
  }

  const handleEmail = async () => {
    if (!email || !password) { setError('Enter your email and password'); return }
    setLoading('email'); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(null)
    if (error) { setError(error.message.toUpperCase()); return }
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase text-zinc-100">IronHQ</h1>
          <p className="text-[10px] text-zinc-600 font-mono mt-1 uppercase tracking-widest">Strength Coaching Platform</p>
        </div>
        <div className="space-y-3">
          <button onClick={handleGoogle} disabled={!!loading} className="w-full flex items-center justify-center gap-3 border border-zinc-800 bg-zinc-900 text-zinc-300 py-3 px-4 text-sm hover:border-zinc-600 hover:text-white disabled:opacity-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {loading === 'google' ? 'Connecting...' : 'Continue with Google'}
          </button>
          <button onClick={handleApple} disabled={!!loading} className="w-full flex items-center justify-center gap-3 border border-zinc-800 bg-zinc-900 text-zinc-300 py-3 px-4 text-sm hover:border-zinc-600 hover:text-white disabled:opacity-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.56-1.32 3.1-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            {loading === 'apple' ? 'Connecting...' : 'Continue with Apple'}
          </button>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Email</p>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourclub.com" className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 p-3 focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Password</p>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEmail()} placeholder="••••••••" className="w-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-100 p-3 focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-700" />
            </div>
          </div>
          {error && <p className="text-[10px] font-mono text-red-500 uppercase tracking-wide">{error}</p>}
          <button onClick={handleEmail} disabled={!!loading} className="w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {loading === 'email' ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-[11px] text-zinc-600">
            First time?{' '}
            <a href="/onboarding" className="text-zinc-400 underline hover:text-zinc-200 transition-colors">Set up your account</a>
          </p>
        </div>
      </div>
    </div>
  )
}
