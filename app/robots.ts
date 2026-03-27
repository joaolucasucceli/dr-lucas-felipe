import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/configuracoes/", "/leads/", "/agendamentos/"],
    },
    sitemap: `${process.env.NEXTAUTH_URL || "https://drlucasfelipe.com.br"}/sitemap.xml`,
  }
}
