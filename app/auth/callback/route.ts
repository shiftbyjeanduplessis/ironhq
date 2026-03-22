// app/auth/callback/route.ts
// Handles the magic link redirect from Supabase.
// Exchanges the code for a session, then routes based on invite token
// or primary_role.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('invite_token')

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // If an invite token is present, send to onboarding
  if (token) {
    return NextResponse.redirect(`${origin}/onboarding?invite_token=${token}`)
  }

  // Otherwise route based on primary_role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active || !profile?.primary_role) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  if (profile.primary_role === 'coach') {
    return NextResponse.redirect(`${origin}/architect`)
  }

  if (profile.primary_role === 'athlete') {
    return NextResponse.redirect(`${origin}/logger`)
  }

  if (profile.primary_role === 'admin') {
    return NextResponse.redirect(`${origin}/admin`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
