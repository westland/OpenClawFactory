/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // In production, Nginx handles /api and /ws → backend:8000.
  // In local dev (npm run dev), Next.js rewrites proxy the same paths.
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/ws',         destination: `${backendUrl}/ws` },
    ]
  },
}

module.exports = nextConfig
