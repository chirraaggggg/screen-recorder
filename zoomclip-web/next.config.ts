import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Required for FFmpeg WASM — SharedArrayBuffer needs COOP/COEP headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },
  // Silence Turbopack warning (Next.js 16 enables Turbopack by default)
  turbopack: {},
}

export default nextConfig
