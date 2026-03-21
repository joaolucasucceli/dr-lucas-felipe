import { CalendarDays, List, Calendar, RefreshCw, CheckCircle2 } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloAgendamentos() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<CalendarDays />}
        titulo="Agendamentos"
        subtitulo="Agenda integrada com Google Calendar e confirmações automáticas"
        gradientClasses="from-green-600 to-emerald-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <List />,
            titulo: "Visualização em lista",
            descricao: "Tabela com todos os agendamentos, filtráveis por status, intervalo de datas e nome do paciente.",
          },
          {
            icone: <Calendar />,
            titulo: "Calendário semanal",
            descricao: "Grade visual da semana atual com slots horários das 8h às 20h. Clique num slot vazio para pré-preencher o agendamento.",
          },
          {
            icone: <RefreshCw />,
            titulo: "Sincronização Google",
            descricao: "Agendamentos criados geram automaticamente eventos no Google Calendar do Dr. Lucas com título, horário e paciente.",
          },
          {
            icone: <CheckCircle2 />,
            titulo: "Confirmações automáticas",
            descricao: "A Ana Júlia envia lembretes automáticos via WhatsApp 6h, 3h e 30 minutos antes de cada consulta agendada.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Crie um agendamento",
            descricao: "Clique em 'Novo Agendamento', selecione o paciente, procedimento, data e horário desejado.",
          },
          {
            numero: 2,
            titulo: "Alterne entre visualizações",
            descricao: "Use as abas 'Lista' e 'Calendário' para diferentes perspectivas da agenda.",
          },
          {
            numero: 3,
            titulo: "Gerencie o status",
            descricao: "Atualize o status conforme o atendimento progride: Agendado → Confirmado → Realizado.",
          },
          {
            numero: 4,
            titulo: "Cancele com cuidado",
            descricao: "Cancelar um agendamento remove o evento do Google Calendar. Prefira 'Remarcado' quando o paciente quer outro horário.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Cria, edita, cancela agendamentos", "Visualiza toda a agenda"],
            },
            {
              perfil: "Atendente",
              acesso: "total",
              acoes: ["Cria, edita, cancela agendamentos", "Visualiza toda a agenda"],
            },
          ]}
        />
        <DicaImportante
          texto="Para a sincronização com o Google Calendar funcionar, configure primeiro a integração em Configurações → Google Agenda. Sem isso, os agendamentos são criados apenas no sistema."
          variante="aviso"
        />
      </div>
    </div>
  )
}
