import type { Metadata } from "next"
import { Navbar } from "./(site)/components/Navbar"
import { HeroSection } from "./(site)/components/HeroSection"
import { SobreSection } from "./(site)/components/SobreSection"
import { PilaresSection } from "./(site)/components/PilaresSection"
import { ProcedimentosSection } from "./(site)/components/ProcedimentosSection"
import { ProtocolosSection } from "./(site)/components/ProtocolosSection"
import { ResultadosSection } from "./(site)/components/ResultadosSection"
import { DiferenciaisSection } from "./(site)/components/DiferenciaisSection"
import { FooterSite } from "./(site)/components/FooterSite"
import { WhatsappFab } from "./(site)/components/WhatsappFab"
import { buildSiteConfig } from "./(site)/components/site-config"

export const metadata: Metadata = {
  title: "Dr. Lucas Ferreira | Estética Avançada — Contorno Corporal",
  description:
    "Especialista em contorno corporal com resultados naturais e harmônicos. Lipoaspiração, hidrolipo, mini lipo e preenchimento glúteo. Agende sua avaliação.",
  openGraph: {
    title: "Dr. Lucas Ferreira | Estética Avançada",
    description:
      "Contorno corporal com resultados naturais e harmônicos. Agende sua avaliação personalizada.",
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: "/images/dr-lucas/foto-1.jpeg",
        width: 800,
        height: 1000,
        alt: "Dr. Lucas Ferreira — Estética Avançada",
      },
    ],
  },
}

export default function HomePage() {
  const config = buildSiteConfig()

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
        <PilaresSection />
        <ProcedimentosSection whatsappLink={config.whatsappLink} />
        <ProtocolosSection whatsappLink={config.whatsappLink} />
        <ResultadosSection />
        <DiferenciaisSection />
      </main>
      <FooterSite config={config} />
      <WhatsappFab whatsappLink={config.whatsappLink} />
    </div>
  )
}
