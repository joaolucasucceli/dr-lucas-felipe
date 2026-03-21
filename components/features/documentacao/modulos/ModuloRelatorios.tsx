import { BarChart3, Users, CalendarDays, MessageSquare } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloRelatorios() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<BarChart3 />}
        titulo="Relatórios"
        subtitulo="Análise de desempenho do negócio com exportação de dados"
        gradientClasses="from-cyan-600 to-teal-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Users />,
            titulo: "Relatório de funil",
            descricao: "Taxa de conversão geral, tempo médio entre etapas e distribuição dos leads por etapa no período selecionado.",
          },
          {
            icone: <CalendarDays />,
            titulo: "Relatório de agendamentos",
            descricao: "Total de agendamentos, taxa de realização e conversão por procedimento e canal de origem.",
          },
          {
            icone: <MessageSquare />,
            titulo: "Relatório do agente IA",
            descricao: "Volume de mensagens, conversas ativas, efetividade dos follow-ups e taxa de resposta dos pacientes.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Selecione a aba",
            descricao: "Escolha entre Funil, Agendamentos ou Atendimento IA conforme o tipo de análise desejada.",
          },
          {
            numero: 2,
            titulo: "Defina o período",
            descricao: "Informe a data de início e fim e clique em 'Gerar Relatório' para carregar os dados.",
          },
          {
            numero: 3,
            titulo: "Exporte os dados",
            descricao: "Use o botão 'Exportar CSV' para baixar os dados filtrados para Excel ou Google Sheets.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Gera e exporta todos os relatórios", "Visualiza todas as métricas"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="Relatórios com períodos superiores a 6 meses podem ter carregamento mais lento. Para análises extensas, prefira exportar os dados e analisar offline em planilhas."
          variante="info"
        />
      </div>
    </div>
  )
}
