import { LayoutDashboard, TrendingUp, GitBranch, PieChart, Bell } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloDashboard() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<LayoutDashboard />}
        titulo="Dashboard"
        subtitulo="Central de métricas e acompanhamento do funil em tempo real"
        gradientClasses="from-blue-600 to-blue-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <TrendingUp />,
            titulo: "Métricas principais",
            descricao: "Total de leads, agendamentos no período, taxa de conversão e atividade do dia reunidos em cards de fácil leitura.",
          },
          {
            icone: <GitBranch />,
            titulo: "Funil por etapa",
            descricao: "Gráfico de barras mostrando a distribuição dos leads em cada uma das 9 etapas do kanban.",
          },
          {
            icone: <PieChart />,
            titulo: "Leads por origem",
            descricao: "Visualização das fontes de aquisição de pacientes (Instagram, indicação, Google, etc.).",
          },
          {
            icone: <Bell />,
            titulo: "Alertas e follow-ups",
            descricao: "Leads em alerta por inatividade e follow-ups pendentes de resposta exibidos em destaque.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Selecione o período",
            descricao: "Escolha entre Hoje, Última semana, Último mês ou Total usando o seletor no canto superior direito da página.",
          },
          {
            numero: 2,
            titulo: "Analise as métricas",
            descricao: "Observe os KPIs nos cards do topo: total de leads, novos no período, agendamentos e taxa de conversão.",
          },
          {
            numero: 3,
            titulo: "Monitore alertas",
            descricao: "Verifique os widgets de Follow-ups Ativos e Leads em Alerta para identificar ações imediatas necessárias.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Vê todos os KPIs incluindo taxa de conversão", "Acessa gráfico de leads por origem", "Visualiza atividade da Ana Júlia"],
            },
            {
              perfil: "Atendente",
              acesso: "parcial",
              acoes: ["Vê leads do dia e agendamentos da semana", "Não vê taxa de conversão nem gráficos avançados"],
            },
          ]}
        />
        <DicaImportante
          texto="O Dashboard é atualizado a cada acesso. Recarregue a página para ver os dados mais recentes. Não há atualização automática em tempo real."
          variante="info"
        />
      </div>
    </div>
  )
}
