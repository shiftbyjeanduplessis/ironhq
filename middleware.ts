// middleware.ts
// Protects coach and athlete routes.
// primary_role decides which shell the user lands in.
// Does NOT enforce data authorization — that is RLS's job.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.delete({ name, ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Unauthenticated → login
  if (!user) {
    if (pathname === '/login' || pathname.startsWith('/auth')) {
      return response
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Already logged in and hitting login → redirect to appropriate shell
  if (pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('primary_role')
      .eq('id', user.id)
      .single()

    if (profile?.primary_role === 'coach') {
      return NextResponse.redirect(new URL('/architect', request.url))
    }
    if (profile?.primary_role === 'athlete') {
      return NextResponse.redirect(new URL('/logger', request.url))
    }
    if (profile?.primary_role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Role-based shell protection
  if (pathname.startsWith('/architect') || pathname.startsWith('/roster')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('primary_role')
      .eq('id', user.id)
      .single()

    if (profile?.primary_role === 'athlete') {
      return NextResponse.redirect(new URL('/logger', request.url))
    }
  }

  if (pathname.startsWith('/logger')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('primary_role')
      .eq('id', user.id)
      .single()

    if (profile?.primary_role === 'coach') {
      return NextResponse.redirect(new URL('/architect', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
