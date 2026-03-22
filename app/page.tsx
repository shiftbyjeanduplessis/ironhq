// app/page.tsx
// The middleware handles routing authenticated users to their shell.
// This page only renders for a brief moment before redirect kicks in.

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
