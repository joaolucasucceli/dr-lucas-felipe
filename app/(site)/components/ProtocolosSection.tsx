import { AnimateOnScroll } from "./AnimateOnScroll"

const PROTOCOLOS = [
  {
    nome: "LIPO FIT",
    tagline: "Preparando seu corpo para a melhor versão",
    descricao:
      "Protocolo integrado que prepara pacientes com sobrepeso para a lipoaspiração com mais segurança, melhores resultados estéticos e menor risco cirúrgico.",
    indicacoes: [
      "IMC acima do ideal",
      "Gordura difusa",
      "Desejo de melhores resultados na lipo",
    ],
    etapas: [
      { numero: "01", titulo: "Avaliação Inicial", descricao: "Anamnese, bioimpedância, exames laboratoriais e definição de metas" },
      { numero: "02", titulo: "Emagrecimento", descricao: "Plano alimentar, estratégias farmacológicas, atividade física e acompanhamento" },
      { numero: "03", titulo: "Preparo Cirúrgico", descricao: "Reavaliação clínica, otimização de exames e planejamento" },
      { numero: "04", titulo: "Lipoaspiração", descricao: "Definição corporal, contorno harmônico e alta precisão" },
      { numero: "05", titulo: "Pós-operatório", descricao: "Drenagem linfática, malha compressiva e manutenção do peso" },
    ],
    diferenciais: [
      "Abordagem completa",
      "Maior segurança",
      "Resultados mais naturais",
    ],
    icone: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    nome: "LIPOBUTT",
    tagline: "Escultura corporal + glúteo definitivo",
    descricao:
      "Protocolo combinado que associa lipoaspiração para escultura corporal e preenchimento glúteo definitivo com PMMA, promovendo definição, volume, projeção e estímulo de colágeno.",
    indicacoes: [
      "Gordura localizada",
      "Baixa projeção glútea",
      "Busca por resultados duradouros",
    ],
    etapas: [
      { numero: "01", titulo: "Planejamento", descricao: "Avaliação global, marcação e definição de vetores" },
      { numero: "02", titulo: "Lipoaspiração", descricao: "Aspiração estratégica para harmonização corporal" },
      { numero: "03", titulo: "Preenchimento PMMA", descricao: "Aplicação profunda com técnica segura para volume e sustentação" },
      { numero: "04", titulo: "Resultados", descricao: "Silhueta definida, glúteo com mais volume, projeção e firmeza" },
    ],
    diferenciais: [
      "Abordagem global",
      "Resultado imediato e progressivo",
      "Glúteo definitivo",
    ],
    icone: (
      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
]

interface ProtocolosSectionProps {
  whatsappLink: string
}

export function ProtocolosSection({ whatsappLink }: ProtocolosSectionProps) {
  return (
    <section id="protocolos" className="relative bg-site-light py-24 lg:py-32">
      {/* Decorative line */}
      <div className="absolute top-0 left-1/2 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-site-gold to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <AnimateOnScroll>
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block text-xs font-semibold tracking-[0.25em] uppercase text-site-gold">
              Protocolos Exclusivos
            </span>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-site-text md:text-4xl">
              Transformação completa com{" "}
              <span className="text-site-green">segurança</span>
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-site-text/60">
              Protocolos desenvolvidos pelo Dr. Lucas Ferreira para resultados
              superiores, combinando técnica avançada com acompanhamento
              personalizado em cada etapa.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Protocol cards */}
        <div className="grid gap-8 lg:grid-cols-2">
          {PROTOCOLOS.map((proto, idx) => (
            <AnimateOnScroll key={proto.nome} delay={idx as 0 | 1}>
              <div className="group rounded-2xl border border-site-text/8 bg-white p-8 transition-all hover:border-site-gold/30 hover:shadow-lg hover:shadow-site-gold/5 lg:p-10">
                {/* Icon + Title */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-site-green/10 text-site-green transition-colors group-hover:bg-site-green group-hover:text-white">
                    {proto.icone}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-site-text">
                      {proto.nome}
                    </h3>
                    <p className="text-sm text-site-gold">{proto.tagline}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="mb-8 text-sm leading-relaxed text-site-text/70">
                  {proto.descricao}
                </p>

                {/* Steps timeline */}
                <div className="mb-8">
                  <span className="mb-4 block text-xs font-semibold tracking-wider uppercase text-site-text/40">
                    Etapas do protocolo
                  </span>
                  <div className="space-y-4">
                    {proto.etapas.map((etapa, i) => (
                      <div key={etapa.numero} className="flex gap-4">
                        {/* Step indicator */}
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-site-green/10 text-xs font-bold text-site-green">
                            {etapa.numero}
                          </div>
                          {i < proto.etapas.length - 1 && (
                            <div className="mt-1 h-full w-px bg-site-green/20" />
                          )}
                        </div>
                        {/* Step content */}
                        <div className="pb-2">
                          <p className="text-sm font-semibold text-site-text">
                            {etapa.titulo}
                          </p>
                          <p className="text-xs leading-relaxed text-site-text/50">
                            {etapa.descricao}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Differentials badges */}
                <div className="mb-8 flex flex-wrap gap-2">
                  {proto.diferenciais.map((dif) => (
                    <span
                      key={dif}
                      className="rounded-full border border-site-gold/20 bg-site-gold/5 px-3 py-1 text-xs font-medium text-site-gold"
                    >
                      {dif}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-site-green transition-colors hover:text-site-green-hover"
                >
                  Saiba mais sobre o {proto.nome}
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
