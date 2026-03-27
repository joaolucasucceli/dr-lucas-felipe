import Image from "next/image"
import { AnimateOnScroll } from "./AnimateOnScroll"

const PROCEDIMENTOS = [
  {
    titulo: "Lipoaspiração Fracionada",
    descricao:
      "Remoção precisa de gordura localizada em sessões fracionadas, com recuperação mais rápida e resultados progressivos.",
    icone: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.066l.2.088M14.25 3.104c.251.023.501.05.75.082M19 14.5l-4.091-4.091a2.25 2.25 0 00-.659-.481" />
      </svg>
    ),
  },
  {
    titulo: "Mini Lipo",
    descricao:
      "Procedimento minimamente invasivo para pequenas áreas, ideal para refinamento e definição corporal pontual.",
    icone: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    titulo: "Hidrolipo",
    descricao:
      "Lipoaspiração assistida por solução tumescente. Menos trauma, menos edema e recuperação confortável.",
    icone: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    ),
  },
  {
    titulo: "Lipo com Enxerto Glúteo",
    descricao:
      "Lipoaspiração combinada com transferência de gordura para os glúteos — contorno corporal completo em um único procedimento.",
    icone: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    titulo: "Preenchimento Glúteo Definitivo",
    descricao:
      "Mais volume, projeção e firmeza para realçar sua silhueta com segurança e alto padrão estético.",
    icone: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
]

interface ProcedimentosSectionProps {
  whatsappLink: string
}

export function ProcedimentosSection({ whatsappLink }: ProcedimentosSectionProps) {
  return (
    <section id="procedimentos" className="relative bg-site-light py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header with photo */}
        <AnimateOnScroll>
          <div className="mb-16 grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="mb-4 inline-block text-xs font-semibold tracking-[0.25em] uppercase text-site-gold">
                Procedimentos
              </span>
              <h2 className="mb-6 text-3xl font-bold tracking-tight text-site-text md:text-4xl">
                Referência em{" "}
                <span className="text-site-green">contorno corporal</span>
              </h2>
              <p className="max-w-lg text-base leading-relaxed text-site-text/70">
                Cada procedimento é conduzido de forma personalizada, desde a
                avaliação inicial até o pós-procedimento, com foco em definição
                corporal com elegância e precisão.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl">
              <Image
                src="/images/dr-lucas/foto-2.jpeg"
                alt="Dr. Lucas Felipe realizando procedimento estético"
                width={600}
                height={750}
                className="h-auto w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-site-dark/30 via-transparent to-transparent" />
            </div>
          </div>
        </AnimateOnScroll>

        {/* Procedure cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROCEDIMENTOS.map((proc, i) => (
            <AnimateOnScroll key={proc.titulo} delay={Math.min(i % 3, 3) as 0 | 1 | 2 | 3}>
              <div className="group rounded-2xl border border-site-text/8 bg-white p-8 transition-all hover:border-site-gold/30 hover:shadow-lg hover:shadow-site-gold/5">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-site-green/10 text-site-green transition-colors group-hover:bg-site-green group-hover:text-white">
                  {proc.icone}
                </div>
                <h3 className="mb-3 text-lg font-semibold text-site-text">
                  {proc.titulo}
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-site-text/60">
                  {proc.descricao}
                </p>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-site-green transition-colors hover:text-site-green-hover"
                >
                  Saiba mais
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </a>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
