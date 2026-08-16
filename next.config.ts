import type { NextConfig } from 'next'

const IMAGE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7

const allowedDevOrigins =
  process.env.NODE_ENV === 'development'
    ? Array.from(
        new Set(
          [process.env.DEV_MOBILE_HOST, ...(process.env.DEV_MOBILE_ALLOWED_HOSTS?.split(',') ?? [])]
            .map((host) => host?.trim())
            .filter((host): host is string => Boolean(host)),
        ),
      )
    : []

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()',
  },
]

if (process.env.NODE_ENV === 'production') {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  })
}

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),
  images: {
    formats: ['image/webp'],
    imageSizes: [16, 24, 28, 32, 48, 54, 56, 64, 96, 108, 112, 128, 256, 384],
    minimumCacheTTL: IMAGE_CACHE_TTL_SECONDS,
    qualities: [75],
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
  },
  webpack(config, { isServer }) {
    if (isServer && config.output) {
      config.output.chunkFilename = 'chunks/[name].js'
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
