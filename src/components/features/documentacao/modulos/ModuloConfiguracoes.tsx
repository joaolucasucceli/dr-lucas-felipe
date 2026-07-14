import { Settings, CalendarDays, MessageCircle, Users } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloConfiguracoes() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<Settings />}
        titulo="Configurações"
        subtitulo="Integrações e automações do sistema"
        gradientClasses="from-slate-600 to-gray-500"
      />

      <FeaturesGrid
        features={[
          {
            icone: <CalendarDays />,
            titulo: "Google Agenda",
            descricao: "Integração que cria eventos automaticamente no calendário quando a Ana Júlia agenda uma avaliação.",
          },
          {
            icone: <MessageCircle />,
            titulo: "WhatsApp",
            descricao: "Conecta o gateway do WhatsApp pra Ana Júlia receber e enviar mensagens.",
          },
          {
            icone: <Users />,
            titulo: "Usuários",
            descricao: "Atalho pra criar e gerenciar quem tem acesso ao sistema.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Configure a Agenda", descricao: "Abra 'Google Agenda', autorize o acesso e selecione o calendário do Dr. Lucas." },
          { numero: 2, titulo: "Conecte o WhatsApp", descricao: "Abra 'WhatsApp', insira a URL e token, escaneie o QR Code com o celular da clínica." },
          { numero: 3, titulo: "Crie usuários", descricao: "Abra 'Usuários' e cadastre atendentes e gestores com perfil e senha." },
        ]}
      />

      <DicaImportante
        texto="Sem o Google Agenda configurado, agendamentos não vão pro calendário. Sem o WhatsApp conectado, a Ana Júlia fica muda."
        variante="aviso"
      />
    </div>
  )
}
