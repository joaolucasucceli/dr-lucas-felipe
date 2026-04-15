interface SectionDividerProps {
  /** Tema de fundo da seção que vem ABAIXO do divisor */
  tema?: "light" | "dark"
  /** Estilo do divisor — "subtle" para transicoes do mesmo tema, "transition" para mudanca de tema */
  estilo?: "subtle" | "transition"
}

/**
 * Divisor visual entre seções da landing page.
 *
 * - "subtle" (default): linha gradient dourada centralizada, posicionada
 *   no topo da próxima seção. Aparece SEMPRE entre seções para criar ritmo.
 * - "transition": gradient suave do tema anterior para o próximo. Usado
 *   apenas quando há mudança de bg-light → bg-dark (ou vice-versa).
 */
export function SectionDivider({
  tema = "light",
  estilo = "subtle",
}: SectionDividerProps) {
  if (estilo === "transition") {
    const fromColor = tema === "dark" ? "from-site-light" : "from-site-dark"
    const toColor = tema === "dark" ? "to-site-dark" : "to-site-light"
    return (
      <div
        aria-hidden="true"
        className={`relative h-12 bg-gradient-to-b ${fromColor} ${toColor}`}
      >
        <div className="absolute top-1/2 left-1/2 h-px w-40 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-site-gold to-transparent" />
      </div>
    )
  }

  // Subtle: pequena linha decorativa alinhada com o tema
  const bgClass = tema === "dark" ? "bg-site-dark" : "bg-site-light"
  return (
    <div aria-hidden="true" className={`relative h-px ${bgClass}`}>
      <div className="absolute top-0 left-1/2 h-px w-40 -translate-x-1/2 bg-gradient-to-r from-transparent via-site-gold to-transparent" />
    </div>
  )
}
