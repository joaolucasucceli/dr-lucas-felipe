import { AnimateOnScroll } from "./AnimateOnScroll"
import { SectionHeader } from "./SectionHeader"

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
      className="relative bg-site-light py-24 lg:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Por que escolher o Dr. Lucas Ferreira"
          titulo="O diferencial está nos"
          destaque="detalhes"
          tema="light"
          align="center"
        />

        <div className="grid gap-8 sm:grid-cols-2">
          {DIFERENCIAIS.map((item, i) => (
            <AnimateOnScroll key={item.numero} delay={Math.min(i, 3) as 0 | 1 | 2 | 3}>
              <div className="group relative rounded-2xl border border-site-text/8 bg-white p-8 transition-all hover:border-site-gold/30 hover:shadow-lg hover:shadow-site-gold/5">
                {/* Number accent */}
                <span className="mb-4 block text-4xl font-bold text-site-gold/20 transition-colors group-hover:text-site-gold/40">
                  {item.numero}
                </span>
                <h3 className="mb-3 text-xl font-semibold text-site-text">
                  {item.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-site-text/60">
                  {item.descricao}
                </p>
                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-site-gold/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
