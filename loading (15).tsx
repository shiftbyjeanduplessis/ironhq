// app/(admin)/admin/clubs/page.tsx
// Lists all clubs. Admins can activate/deactivate.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminClubsClient from '@/components/admin/AdminClubsClient'

export default async function AdminClubsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('primary_role').eq('id', user.id).single()
  if (profile?.primary_role !== 'admin') redirect('/architect')

  const { data: clubs } = await supabase.rpc('admin_list_clubs')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 py-4 border-b border-zinc-800">
        <h1 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
          Clubs — {clubs?.length ?? 0} total
        </h1>
      </div>
      <AdminClubsClient clubs={clubs ?? []} />
    </div>
  )
}
