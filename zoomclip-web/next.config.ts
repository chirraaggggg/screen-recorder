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
  // Webpack: handle WASM files
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true }
    return config
  },
}

export default nextConfig
