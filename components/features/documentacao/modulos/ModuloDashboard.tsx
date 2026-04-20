import { LayoutDashboard, TrendingUp, GitBranch, Bell } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloDashboard() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<LayoutDashboard />}
        titulo="Dashboard"
        subtitulo="Métricas e acompanhamento do funil em tempo real"
        gradientClasses="from-blue-600 to-blue-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <TrendingUp />,
            titulo: "Métricas principais",
            descricao: "Total de leads, avaliações agendadas e taxa de conversão do período selecionado.",
          },
          {
            icone: <GitBranch />,
            titulo: "Funil por etapa",
            descricao: "Distribuição dos leads nas 4 etapas: acolhimento, qualificação, agendamento e reunião agendada.",
          },
          {
            icone: <Bell />,
            titulo: "Alertas do dia",
            descricao: "Follow-ups pendentes e leads inativos em destaque pra você priorizar.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Selecione o período", descricao: "Use o seletor no topo: hoje, semana, mês ou total." },
          { numero: 2, titulo: "Analise as métricas", descricao: "Veja os cards de KPI e o gráfico do funil." },
          { numero: 3, titulo: "Aja nos alertas", descricao: "Clique nos leads em alerta pra abrir o detalhe e responder." },
        ]}
      />

      <DicaImportante
        texto="Os dados atualizam a cada recarga da página. Não há atualização automática em tempo real."
        variante="info"
      />
    </div>
  )
}
