import { Bot, MessageSquare, Bell, Clock, GitBranch } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloAnaJulia() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<Bot />}
        titulo="Ana Júlia"
        subtitulo="Painel de desempenho e monitoramento do agente de atendimento IA"
        gradientClasses="from-indigo-600 to-blue-500"
      />

      <FeaturesGrid
        features={[
          {
            icone: <MessageSquare />,
            titulo: "Mensagens enviadas e recebidas",
            descricao: "Total de interações no período: mensagens enviadas pela IA e respostas dos pacientes via WhatsApp.",
          },
          {
            icone: <Bell />,
            titulo: "Follow-ups automáticos",
            descricao: "Follow-ups enviados em 1h, 6h e 24h após a última mensagem do paciente sem resposta recebida.",
          },
          {
            icone: <Clock />,
            titulo: "Confirmações de consulta",
            descricao: "Lembretes automáticos enviados 6h antes, 3h antes e 30 minutos antes de cada consulta agendada.",
          },
          {
            icone: <GitBranch />,
            titulo: "Progresso no funil",
            descricao: "Quantos leads a IA qualificou, agendou consultas e avançou para 'Consulta Agendada' no período.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Selecione o período",
            descricao: "Escolha entre Hoje, Esta Semana ou Este Mês para filtrar os dados de atividade do agente.",
          },
          {
            numero: 2,
            titulo: "Analise as métricas",
            descricao: "Veja o volume de mensagens, leads atendidos, consultas agendadas e taxa de sucesso dos follow-ups.",
          },
          {
            numero: 3,
            titulo: "Acompanhe o funil",
            descricao: "O card 'Funil do Agente' mostra quantos leads cada etapa do processo automatizado atingiu.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Visualiza todas as métricas do agente", "Acompanha funil e follow-ups"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="A Ana Júlia opera 24 horas por dia, 7 dias por semana. O painel é retrospectivo — exibe o que já aconteceu. Configure o WhatsApp em Configurações para a IA funcionar."
          variante="info"
        />
      </div>
    </div>
  )
}
