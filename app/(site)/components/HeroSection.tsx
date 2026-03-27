import Image from "next/image"

interface HeroSectionProps {
  whatsappLink: string
}

export function HeroSection({ whatsappLink }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-site-dark">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-site-dark via-site-dark-alt to-site-dark-deep" />

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-site-gold/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-site-green/10 blur-[100px]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-32 lg:grid-cols-2 lg:gap-20">
        {/* Text */}
        <div className="order-2 lg:order-1">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-site-gold/30 bg-site-gold/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-site-gold" />
            <span className="text-xs font-medium tracking-wide text-site-gold">
              Pós-graduando em Cirurgia Plástica
            </span>
          </div>

          <h1 className="mb-6 text-4xl leading-[1.1] font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            Contorno corporal com{" "}
            <span className="text-site-gold">resultados naturais</span> e
            harmônicos
          </h1>

          <p className="mb-10 max-w-lg text-lg leading-relaxed text-white/60">
            Dr. Lucas Felipe — médico especialista em estética corporal.
            Lipoaspiração, hidrolipo e preenchimento glúteo com segurança,
            técnica e resultados que valorizam a sua individualidade.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-site-green px-8 py-4 text-base font-semibold text-white transition-all hover:bg-site-green-hover hover:shadow-xl hover:shadow-site-green/30"
            >
              <svg
                className="h-5 w-5 transition-transform group-hover:scale-110"
                fill="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="WhatsApp"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Agende sua avaliação
            </a>
            <a
              href="#procedimentos"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              Conheça os procedimentos
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </a>
          </div>
        </div>

        {/* Photo */}
        <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
          <div className="relative">
            {/* Gold border accent */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-site-gold/40 via-transparent to-site-gold/20 blur-sm" />
            <div className="relative overflow-hidden rounded-2xl">
              <Image
                src="/images/dr-lucas/foto-1.jpeg"
                alt="Dr. Lucas Felipe — Médico especialista em estética corporal"
                width={500}
                height={625}
                className="h-auto w-full object-cover"
                priority
              />
              {/* Subtle overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-site-dark/40 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex h-8 w-5 items-start justify-center rounded-full border border-white/20 p-1">
          <div className="h-2 w-1 animate-bounce rounded-full bg-white/40" />
        </div>
      </div>
    </section>
  )
}
