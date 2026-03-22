// utils/supabase/server.ts
// Server-side Supabase client for use in Server Components, Route Handlers,
// and Server Actions. Uses @supabase/ssr createServerClient.
// Cookie access is read-only in Server Components — set/remove are no-ops
// unless called from a Route Handler or Server Action where cookies() is mutable.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // set() throws in Server Components — safe to ignore.
            // Mutations happen in middleware or Route Handlers.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Same as above.
          }
        },
      },
    }
  )
}
