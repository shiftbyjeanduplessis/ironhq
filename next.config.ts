import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        // Allow Supabase storage for club logos (club branding feature)
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Suppress Supabase SSR cookie warnings in development
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

export default nextConfig
