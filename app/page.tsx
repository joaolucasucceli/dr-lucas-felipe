import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { Navbar } from "./(site)/components/Navbar"
import { HeroSection } from "./(site)/components/HeroSection"
import { SobreSection } from "./(site)/components/SobreSection"
import { ProcedimentosSection } from "./(site)/components/ProcedimentosSection"
import { DiferenciaisSection } from "./(site)/components/DiferenciaisSection"
import { FormularioSection } from "./(site)/components/FormularioSection"
import { CtaSection } from "./(site)/components/CtaSection"
import { FooterSite } from "./(site)/components/FooterSite"
import { WhatsappFab } from "./(site)/components/WhatsappFab"
import { buildFallbackConfig, type SiteConfigProps } from "./(site)/components/site-config"

export const metadata: Metadata = {
  title: "Dr. Lucas Felipe | Medicina Estética — Contorno Corporal",
  description:
    "Especialista em contorno corporal com resultados naturais e harmônicos. Lipoaspiração, hidrolipo, mini lipo e preenchimento glúteo. Agende sua avaliação.",
  openGraph: {
    title: "Dr. Lucas Felipe | Medicina Estética",
    description:
      "Contorno corporal com resultados naturais e harmônicos. Agende sua avaliação personalizada.",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "/images/dr-lucas/foto-1.jpeg",
        width: 800,
        height: 1000,
        alt: "Dr. Lucas Felipe — Médico Estética",
      },
    ],
  },
}

async function getSiteConfig(): Promise<SiteConfigProps> {
  try {
    const dbConfig = await prisma.configSite.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: "desc" },
    })

    if (!dbConfig || !dbConfig.whatsappNumero) {
      return buildFallbackConfig()
    }

    const numero = dbConfig.whatsappNumero
    const mensagem =
      dbConfig.whatsappMensagem ||
      "Olá! Gostaria de agendar uma avaliação com o Dr. Lucas Felipe."
    const whatsappLink = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`

    const fallback = buildFallbackConfig()

    return {
      whatsappLink,
      medicoNome: dbConfig.medicoNome || fallback.medicoNome,
      medicoEspecialidade:
        dbConfig.medicoEspecialidade || fallback.medicoEspecialidade,
      medicoCrm: dbConfig.medicoCrm || fallback.medicoCrm,
      instagramUrl: dbConfig.instagramUrl || fallback.instagramUrl,
      contatoTelefone: dbConfig.contatoTelefone || fallback.contatoTelefone,
      contatoEndereco: dbConfig.contatoEndereco || fallback.contatoEndereco,
      contatoCidade: dbConfig.contatoCidade || fallback.contatoCidade,
    }
  } catch {
    return buildFallbackConfig()
  }
}

export default async function HomePage() {
  const config = await getSiteConfig()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: config.medicoNome,
    description:
      "Especialista em contorno corporal com resultados naturais e harmônicos. Lipoaspiração, hidrolipo, mini lipo e preenchimento glúteo.",
    medicalSpecialty: "PlasticSurgery",
    image: "/images/dr-lucas/foto-1.jpeg",
    telephone: config.contatoTelefone,
    address: {
      "@type": "PostalAddress",
      streetAddress: config.contatoEndereco,
      addressLocality: config.contatoCidade,
      addressCountry: "BR",
    },
  }

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar whatsappLink={config.whatsappLink} />
      <main id="conteudo">
        <HeroSection whatsappLink={config.whatsappLink} />
        <SobreSection />
        <ProcedimentosSection whatsappLink={config.whatsappLink} />
        <DiferenciaisSection />
        <FormularioSection />
        <CtaSection whatsappLink={config.whatsappLink} />
      </main>
      <FooterSite config={config} />
      <WhatsappFab whatsappLink={config.whatsappLink} />
    </div>
  )
}
