import { FormularioCaptacao } from "./FormularioCaptacao"
import { AnimateOnScroll } from "./AnimateOnScroll"

export function FormularioSection() {
  return (
    <section
      id="formulario"
      className="relative overflow-hidden bg-site-dark-deep py-24 lg:py-32"
    >
      {/* Background accents */}
      <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-site-gold/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-site-green/8 blur-[100px]" />

      {/* Decorative top border */}
      <div className="absolute top-0 left-1/2 h-px w-60 -translate-x-1/2 bg-gradient-to-r from-transparent via-site-gold/30 to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <AnimateOnScroll>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Copy */}
            <div>
              <span className="mb-4 inline-block text-xs font-semibold tracking-[0.25em] uppercase text-site-gold">
                Atendimento personalizado
              </span>
              <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                Receba contato da{" "}
                <span className="text-site-gold">nossa equipe</span>{" "}
                pelo WhatsApp
              </h2>
              <p className="mb-8 max-w-lg text-lg leading-relaxed text-white/60">
                Preencha o formulário e nossa assistente Ana Júlia vai entrar em
                contato com você pelo WhatsApp para iniciar seu atendimento
                personalizado.
              </p>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-site-gold/10 text-site-gold">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <p className="text-sm text-white/50">
                    Preencha seus dados e o procedimento de interesse
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-site-gold/10 text-site-gold">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <p className="text-sm text-white/50">
                    Nossa equipe entra em contato pelo seu WhatsApp
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-site-gold/10 text-site-gold">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <p className="text-sm text-white/50">
                    Agendamos sua avaliação com o Dr. Lucas
                  </p>
                </div>
              </div>
            </div>

            {/* Form card */}
            <div className="dark rounded-2xl border border-white/8 bg-white/[0.03] p-8 backdrop-blur-sm lg:p-10">
              <h3 className="mb-6 text-lg font-semibold text-white">
                Quero ser atendido
              </h3>
              <FormularioCaptacao />
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
