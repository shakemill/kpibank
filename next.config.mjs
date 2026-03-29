/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Évite que le bundler (Turbopack/Webpack) n'analyse tout Prisma → compile plus vite
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],
  async redirects() {
    return [{ source: '/saisieAmeliorer', destination: '/saisie', permanent: false }]
  },
}

export default nextConfig
