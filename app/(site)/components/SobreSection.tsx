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
              Sobre o Dr. Lucas Ferreira
            </span>

            <h2 className="mb-8 text-3xl font-bold tracking-tight text-site-text md:text-4xl">
              Mais de 10 anos dedicados à{" "}
              <span className="text-site-green">medicina e à estética</span>
            </h2>

            <div className="space-y-5 text-base leading-relaxed text-site-text/70">
              <p>
                Sou um médico dedicado, profundamente comprometido com a
                excelência no cuidado ao paciente. Atualmente curso especialização
                em cirurgia geral e plástica, com atuação focada em lipoaspiração
                fracionada, preenchimento corporal e preenchimento glúteo
                definitivo.
              </p>
              <p>
                Com mais de 10 anos de trajetória na medicina, meu percurso é
                marcado pela atualização constante e busca por inovação. Minha
                jornada começou na medicina de urgência e emergência — onde atuei
                como diretor médico e coordenador médico — desenvolvendo
                habilidades essenciais como agilidade, precisão e tomada de
                decisão em cenários críticos. Essa base fortalece cada
                procedimento que realizo hoje.
              </p>
              <p>
                Na estética, sou referência em contorno corporal: lipoaspiração
                fracionada, mini lipo, hidrolipo e lipo com enxerto glúteo. Meu
                diferencial está em entregar resultados naturais e harmônicos,
                valorizando a individualidade de cada paciente.
              </p>
              <p>
                Mais do que procedimentos, meu propósito é cuidar de pessoas —
                sempre pautado pelo respeito, ética e amor ao próximo. Cada
                atendimento é conduzido de forma personalizada, da avaliação
                inicial ao pós-procedimento.
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
