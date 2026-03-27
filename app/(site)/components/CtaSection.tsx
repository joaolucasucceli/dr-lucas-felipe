import Image from "next/image"
import { AnimateOnScroll } from "./AnimateOnScroll"

interface CtaSectionProps {
  whatsappLink: string
}

export function CtaSection({ whatsappLink }: CtaSectionProps) {
  return (
    <section className="relative overflow-hidden bg-site-dark py-24 lg:py-32">
      {/* Decorative top border */}
      <div className="absolute top-0 left-1/2 h-px w-60 -translate-x-1/2 bg-gradient-to-r from-transparent via-site-gold/40 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <AnimateOnScroll>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Photo */}
            <div className="flex justify-center lg:justify-start">
              <div className="relative">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-site-gold/30 via-transparent to-site-green/20 blur-sm" />
                <div className="relative overflow-hidden rounded-2xl">
                  <Image
                    src="/images/dr-lucas/foto-3.jpeg"
                    alt="Dr. Lucas Felipe — Agende sua avaliação"
                    width={480}
                    height={600}
                    className="h-auto w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-site-dark/50 via-transparent to-transparent" />
                </div>
              </div>
            </div>

            {/* CTA Content */}
            <div>
              <span className="mb-4 inline-block text-xs font-semibold tracking-[0.25em] uppercase text-site-gold">
                Transformação com segurança
              </span>
              <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                Eleve sua{" "}
                <span className="text-site-gold">autoestima</span> e{" "}
                <span className="text-site-gold">bem-estar</span>
              </h2>
              <p className="mb-8 max-w-lg text-lg leading-relaxed text-white/60">
                Cada atendimento é conduzido de forma personalizada. Agende sua
                avaliação e descubra como o Dr. Lucas pode ajudar você a alcançar
                a melhor versão do seu corpo com segurança, ética e resultados
                naturais.
              </p>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 rounded-full bg-site-green px-10 py-5 text-lg font-semibold text-white transition-all hover:bg-site-green-hover hover:shadow-2xl hover:shadow-site-green/30"
              >
                <svg
                  className="h-6 w-6 transition-transform group-hover:scale-110"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  role="img"
                  aria-label="WhatsApp"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Fale com nosso time no WhatsApp
              </a>

              <p className="mt-6 text-sm text-white/30">
                Atendimento rápido e personalizado pelo nosso time de
                pré-atendimento.
              </p>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
