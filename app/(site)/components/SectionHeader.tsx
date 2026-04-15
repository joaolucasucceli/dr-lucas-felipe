import { AnimateOnScroll } from "./AnimateOnScroll"

interface SectionHeaderProps {
  /** Texto pequeno em maiúsculas (eyebrow) — sempre dourado */
  eyebrow: string
  /** Início do título (parte sem destaque) */
  titulo: string
  /** Palavra(s) com cor de destaque — verde em fundo claro, dourado em escuro */
  destaque?: string
  /** Texto após o destaque, opcional */
  posDestaque?: string
  /** Parágrafo descritivo abaixo do título */
  descricao?: string
  /** Tema de fundo: muda cor de texto e do destaque */
  tema?: "light" | "dark"
  /** Alinhamento do bloco */
  align?: "center" | "left"
}

/**
 * Componente reutilizável de cabeçalho de seção.
 * Padroniza eyebrow + h2 com destaque + descrição em todas as seções.
 */
export function SectionHeader({
  eyebrow,
  titulo,
  destaque,
  posDestaque,
  descricao,
  tema = "light",
  align = "center",
}: SectionHeaderProps) {
  const isDark = tema === "dark"
  const tituloColor = isDark ? "text-white" : "text-site-text"
  const destaqueColor = isDark ? "text-site-gold" : "text-site-green"
  const descricaoColor = isDark ? "text-white/50" : "text-site-text/70"
  const alignClass = align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl"

  return (
    <AnimateOnScroll>
      <div className={`mb-12 ${alignClass}`}>
        <span className="mb-4 inline-block text-xs font-semibold tracking-[0.25em] uppercase text-site-gold">
          {eyebrow}
        </span>
        <h2 className={`mb-4 text-3xl font-bold tracking-tight md:text-4xl ${tituloColor}`}>
          {titulo}
          {destaque && (
            <>
              {" "}
              <span className={destaqueColor}>{destaque}</span>
            </>
          )}
          {posDestaque && <> {posDestaque}</>}
        </h2>
        {descricao && (
          <p className={`text-base leading-relaxed ${descricaoColor}`}>
            {descricao}
          </p>
        )}
      </div>
    </AnimateOnScroll>
  )
}
