import { Shield, Sparkles, UserCheck } from "lucide-react"
import { AnimateOnScroll } from "./AnimateOnScroll"

const DIFERENCIAIS_RAPIDOS = [
  {
    icon: Shield,
    titulo: "Segurança",
    descricao: "Base em medicina de urgência e emergência",
  },
  {
    icon: Sparkles,
    titulo: "Resultados Naturais",
    descricao: "Harmonia e individualidade em cada procedimento",
  },
  {
    icon: UserCheck,
    titulo: "Atendimento Personalizado",
    descricao: "Da avaliação inicial ao pós-procedimento",
  },
]

export function SobreSection() {
  return (
    <section id="sobre" className="relative bg-site-light py-24 lg:py-32">
      {/* Decorative line */}
      <div className="absolute top-0 left-1/2 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-site-gold to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        <AnimateOnScroll>
          <div className="mx-auto max-w-3xl text-center">
            {/* Label */}
            <span className="mb-4 inline-block text-xs font-semibold tracking-[0.25em] uppercase text-site-gold">
              Sobre o Médico
            </span>

            <h2 className="mb-8 text-3xl font-bold tracking-tight text-site-text md:text-4xl">
              Excelência técnica com{" "}
              <span className="text-site-green">compromisso humano</span>
            </h2>

            <div className="space-y-5 text-base leading-relaxed text-site-text/70">
              <p>
                Dr. Lucas Felipe P. Ferreira é médico com atuação destacada na
                área da estética e pós-graduando em cirurgia plástica. Sua
                trajetória é marcada pela busca constante por aperfeiçoamento
                técnico, aliando conhecimento científico, senso estético apurado e
                foco absoluto na satisfação e segurança de seus pacientes.
              </p>
              <p>
                Com experiência sólida na medicina de urgência e emergência —
                tanto no atendimento adulto quanto pediátrico — desenvolveu
                habilidades essenciais como agilidade, precisão e tomada de
                decisão em cenários críticos. Essa base fortalece ainda mais sua
                prática na estética, garantindo procedimentos conduzidos com alto
                nível de segurança e responsabilidade.
              </p>
              <p>
                Também possui forte atuação na gestão em saúde, exercendo funções
                como coordenador médico e diretor técnico, sempre com foco em
                eficiência, qualidade e excelência no atendimento.
              </p>
            </div>
          </div>
        </AnimateOnScroll>

        {/* Quick differentials */}
        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {DIFERENCIAIS_RAPIDOS.map((item, i) => (
            <AnimateOnScroll key={item.titulo} delay={(i + 1) as 1 | 2 | 3}>
              <div className="group flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-site-green/10 transition-colors group-hover:bg-site-green/20">
                  <item.icon className="h-6 w-6 text-site-green" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-site-text">
                  {item.titulo}
                </h3>
                <p className="text-sm leading-relaxed text-site-text/60">
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
