import { Stethoscope, Package, Trash2, Clock } from "lucide-react"
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
            icone: <Trash2 />,
            titulo: "Excluir",
            descricao: "Não há ativar/desativar — ou existe ou não existe. Excluir preserva agendamentos antigos no histórico.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Veja o catálogo", descricao: "Tabela lista todos os procedimentos com tipo e duração." },
          { numero: 2, titulo: "Cadastre", descricao: "'Novo Procedimento': nome, tipo, duração e orientações pós-operatórias." },
          { numero: 3, titulo: "Gerencie", descricao: "Menu de ações (três pontos) pra editar ou excluir." },
        ]}
      />

      <DicaImportante
        texto="O preço não fica no sistema — é definido caso a caso pelo Dr. Lucas na avaliação online. Excluir um procedimento o tira de toda busca, mas agendamentos antigos que apontavam pra ele continuam preservados no histórico."
        variante="sucesso"
      />
    </div>
  )
}
