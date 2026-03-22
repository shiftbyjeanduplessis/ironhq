// app/layout.tsx
// Root layout. Minimal — shell layouts live in route groups.

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IronHQ',
  description: 'Professional strength coaching platform',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
