import { Kanban, Columns2, Bot, Filter } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloAtendimentos() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<Kanban />}
        titulo="Atendimentos"
        subtitulo="Kanban do funil conduzido pela Ana Júlia no WhatsApp"
        gradientClasses="from-orange-500 to-amber-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Columns2 />,
            titulo: "6 etapas do funil",
            descricao: "Acolhimento → Qualificação → Orçamento → Agendamento → Reunião Agendada → Atendimento Humano.",
          },
          {
            icone: <Bot />,
            titulo: "Movimentação automática",
            descricao: "A Ana Júlia avança o lead até reunião agendada e separa pedidos humanos em Atendimento Humano.",
          },
          {
            icone: <Filter />,
            titulo: "Filtro por procedimento",
            descricao: "Use o filtro de procedimento para segmentar os leads do funil.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Visualize o funil", descricao: "Cada coluna é uma etapa; o contador mostra quantos leads estão nela." },
          { numero: 2, titulo: "Abra o card", descricao: "Clique num lead pra ver conversa completa, fotos e agendamento." },
          { numero: 3, titulo: "Converta em paciente", descricao: "Na etapa 'Reunião Agendada', use o botão 'Converter em Paciente' quando fizer sentido." },
        ]}
      />

      <DicaImportante
        texto="A Ana Júlia conduz o funil comercial, orçamento e agenda. A conversão Lead → Paciente continua manual, feita pelo gestor."
        variante="info"
      />
    </div>
  )
}
