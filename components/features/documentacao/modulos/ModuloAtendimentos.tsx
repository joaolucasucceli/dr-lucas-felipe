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
            titulo: "4 etapas do funil",
            descricao: "Acolhimento → Qualificação → Agendamento → Reunião Agendada.",
          },
          {
            icone: <Bot />,
            titulo: "Movimentação automática",
            descricao: "A Ana Júlia avança o lead até reunião agendada. Depois, o gestor converte em paciente manualmente.",
          },
          {
            icone: <Filter />,
            titulo: "Filtros avançados",
            descricao: "Filtre por responsável, etapa, procedimento ou busca por nome.",
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
        texto="A Ana Júlia só conduz até 'Reunião Agendada'. A conversão Lead → Paciente é sempre manual, feita pelo gestor."
        variante="info"
      />
    </div>
  )
}
