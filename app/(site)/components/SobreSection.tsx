import { AnimateOnScroll } from "./AnimateOnScroll"
import { SectionHeader } from "./SectionHeader"

export function SobreSection() {
  return (
    <section id="sobre" className="relative bg-site-light py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Sobre o Dr. Lucas Ferreira"
          titulo="Mais de 10 anos dedicados à"
          destaque="medicina e à estética"
          tema="light"
          align="center"
        />

        <AnimateOnScroll>
          <div className="mx-auto max-w-3xl text-center">
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
      </div>
    </section>
  )
}
