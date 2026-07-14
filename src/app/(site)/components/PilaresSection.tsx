import { Shield, Sparkles, UserCheck, Target } from "lucide-react"
import { AnimateOnScroll } from "./AnimateOnScroll"
import { SectionHeader } from "./SectionHeader"

const PILARES = [
  {
    icon: Shield,
    titulo: "Segurança",
    descricao: "Base sólida em medicina de urgência e emergência. Cada procedimento é conduzido com máxima responsabilidade.",
  },
  {
    icon: Sparkles,
    titulo: "Resultados Naturais",
    descricao: "Valorização da individualidade de cada paciente. Nada artificial — apenas a melhor versão de você.",
  },
  {
    icon: UserCheck,
    titulo: "Acompanhamento Completo",
    descricao: "Da avaliação inicial ao pós-procedimento. Compromisso com resultados de excelência e cuidado próximo.",
  },
  {
    icon: Target,
    titulo: "Técnicas Avançadas",
    descricao: "Atualização constante em lipoaspiração, preenchimento corporal e protocolos exclusivos.",
  },
]

export function PilaresSection() {
  return (
    <section className="relative bg-site-dark py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Por que o Dr. Lucas"
          titulo="Pilares do nosso"
          destaque="atendimento"
          tema="dark"
          align="center"
        />

        <div className="grid grid-cols-2 gap-6 lg:gap-8">
          {PILARES.map((item, i) => (
            <AnimateOnScroll key={item.titulo} delay={Math.min(i, 3) as 0 | 1 | 2 | 3}>
              <div className="group flex flex-col items-center rounded-2xl border border-white/8 bg-white/[0.03] p-6 text-center backdrop-blur-sm transition-all hover:border-site-gold/20 hover:bg-white/[0.06] lg:p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-site-gold/10 transition-colors group-hover:bg-site-gold/20">
                  <item.icon className="h-5 w-5 text-site-gold" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white lg:text-lg">
                  {item.titulo}
                </h3>
                <p className="text-xs leading-relaxed text-white/50 lg:text-sm">
                  {item.descricao}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
