/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer (geracao do PDF de orcamento) tem deps que nao devem
  // ser bundladas pelo Next — mantem como dependencia externa no server (Node).
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gbcrmiplukilalwyjxxp.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/relatorios",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/leads",
        destination: "/contatos",
        permanent: true,
      },
      {
        source: "/leads/:path*",
        destination: "/contatos/:path*",
        permanent: true,
      },
      {
        source: "/pacientes",
        destination: "/contatos",
        permanent: true,
      },
      {
        source: "/pacientes/:path*",
        destination: "/contatos/:path*",
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
}

export default nextConfig
