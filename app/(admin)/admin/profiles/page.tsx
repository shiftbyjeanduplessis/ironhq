// app/(admin)/admin/profiles/page.tsx
// Lists all non-admin profiles. Admins can activate/deactivate.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminProfilesClient from '@/components/admin/AdminProfilesClient'

export default async function AdminProfilesPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('primary_role').eq('id', user.id).single()
  if (profile?.primary_role !== 'admin') redirect('/architect')

  const { data: profiles } = await supabase.rpc('admin_list_profiles', {
    p_limit: 200,
    p_offset: 0,
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="shrink-0 px-6 py-4 border-b border-zinc-800">
        <h1 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
          Profiles — {profiles?.length ?? 0} total
        </h1>
      </div>
      <AdminProfilesClient profiles={profiles ?? []} />
    </div>
  )
}
