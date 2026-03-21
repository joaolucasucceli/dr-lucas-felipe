import { Settings, CalendarDays, MessageCircle, Users, Zap } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloConfiguracoes() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<Settings />}
        titulo="Configurações"
        subtitulo="Integrações, automações e configurações gerais do sistema"
        gradientClasses="from-slate-600 to-gray-500"
      />

      <FeaturesGrid
        features={[
          {
            icone: <CalendarDays />,
            titulo: "Google Agenda",
            descricao: "Integração OAuth com o Google Calendar para criação automática de eventos ao agendar consultas.",
          },
          {
            icone: <MessageCircle />,
            titulo: "WhatsApp via Uazapi",
            descricao: "Conexão com o gateway WhatsApp para recebimento e envio de mensagens pela Ana Júlia.",
          },
          {
            icone: <Users />,
            titulo: "Gestão de usuários",
            descricao: "Atalho direto para criar e gerenciar os usuários com acesso ao sistema.",
          },
          {
            icone: <Zap />,
            titulo: "Automações CRON",
            descricao: "Follow-ups e confirmações de consulta são executados automaticamente a cada hora. Possível forçar execução manual para testes.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Configure o Google Agenda",
            descricao: "Clique no card 'Google Agenda' e siga as instruções para autorizar via OAuth. Selecione o calendário que receberá os eventos.",
          },
          {
            numero: 2,
            titulo: "Conecte o WhatsApp",
            descricao: "Clique em 'WhatsApp', insira a URL e o token da Uazapi, salve e escaneie o QR Code com o celular do Dr. Lucas.",
          },
          {
            numero: 3,
            titulo: "Monitore as automações",
            descricao: "O card 'Automações' exibe o status do CRON. Use 'Forçar execução' para testar follow-ups e confirmações manualmente.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Configura Google Agenda e WhatsApp", "Gerencia usuários e automações"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="Sem o Google Agenda configurado, agendamentos não geram eventos no calendário. Sem o WhatsApp conectado, a Ana Júlia fica silenciosa e não recebe nem envia mensagens."
          variante="aviso"
        />
      </div>
    </div>
  )
}
