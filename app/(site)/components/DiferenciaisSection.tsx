import { AnimateOnScroll } from "./AnimateOnScroll"

const DIFERENCIAIS = [
  {
    numero: "01",
    titulo: "Resultados Naturais",
    descricao:
      "Valorização da individualidade de cada paciente. Nada artificial — apenas a melhor versão de você.",
  },
  {
    numero: "02",
    titulo: "Segurança Acima de Tudo",
    descricao:
      "Base sólida em medicina de urgência e emergência. Cada procedimento é conduzido com máxima segurança e responsabilidade.",
  },
  {
    numero: "03",
    titulo: "Acompanhamento Completo",
    descricao:
      "Da avaliação inicial ao pós-procedimento. Compromisso com resultados de excelência e cuidado próximo.",
  },
  {
    numero: "04",
    titulo: "Definição com Elegância",
    descricao:
      "Contorno corporal harmônico e preciso. Técnicas avançadas para esculpir com naturalidade.",
  },
]

export function DiferenciaisSection() {
  return (
    <section
      id="diferenciais"
      className="relative overflow-hidden bg-site-dark py-24 lg:py-32"
    >
      {/* Background accents */}
      <div className="absolute top-1/2 left-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-site-green/8 blur-[120px]" />
      <div className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full bg-site-gold/5 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <AnimateOnScroll>
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block text-xs font-semibold tracking-[0.25em] uppercase text-site-gold">
              Por que escolher o Dr. Lucas
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              O diferencial está nos{" "}
              <span className="text-site-gold">detalhes</span>
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid gap-8 sm:grid-cols-2">
          {DIFERENCIAIS.map((item, i) => (
            <AnimateOnScroll key={item.numero} delay={Math.min(i, 3) as 0 | 1 | 2 | 3}>
              <div className="group relative rounded-2xl border border-white/8 bg-white/[0.03] p-8 backdrop-blur-sm transition-all hover:border-site-gold/20 hover:bg-white/[0.06]">
                {/* Number accent */}
                <span className="mb-4 block text-4xl font-bold text-site-gold/15 transition-colors group-hover:text-site-gold/30">
                  {item.numero}
                </span>
                <h3 className="mb-3 text-xl font-semibold text-white">
                  {item.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {item.descricao}
                </p>
                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-site-gold/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
