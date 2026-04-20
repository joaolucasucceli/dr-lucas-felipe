import { Stethoscope, Package, ToggleLeft, Clock } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloProcedimentos() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<Stethoscope />}
        titulo="Procedimentos"
        subtitulo="Catálogo dos procedimentos da clínica"
        gradientClasses="from-rose-600 to-pink-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Package />,
            titulo: "Catálogo",
            descricao: "Nome, tipo (cirúrgico, estético, minimamente invasivo) e duração em minutos.",
          },
          {
            icone: <Clock />,
            titulo: "Duração e pós-op",
            descricao: "Cada procedimento tem instruções pós-operatórias próprias, usadas no atendimento.",
          },
          {
            icone: <ToggleLeft />,
            titulo: "Ativar e desativar",
            descricao: "Desativados somem pra seleção, mas mantém histórico dos leads antigos.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Veja o catálogo", descricao: "Tabela lista todos com tipo, duração e status." },
          { numero: 2, titulo: "Cadastre", descricao: "'Novo Procedimento': nome, tipo, duração e orientações pós-operatórias." },
          { numero: 3, titulo: "Gerencie", descricao: "Menu de ações (três pontos) pra editar ou ativar/desativar." },
        ]}
      />

      <DicaImportante
        texto="O preço não fica no sistema — é definido caso a caso pelo Dr. Lucas na avaliação presencial. Desative em vez de excluir pra preservar histórico."
        variante="sucesso"
      />
    </div>
  )
}
