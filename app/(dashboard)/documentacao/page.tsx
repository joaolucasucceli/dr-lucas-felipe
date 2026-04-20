import {
  LayoutDashboard,
  Kanban,
  UserSearch,
  Users,
  Stethoscope,
  Brain,
  Film,
  Settings,
  User,
} from "lucide-react"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { TabsDocumentacao } from "@/components/features/documentacao/TabsDocumentacao"
import { BotaoDownloadDoc } from "@/components/features/documentacao/BotaoDownloadDoc"
import { ModuloDashboard } from "@/components/features/documentacao/modulos/ModuloDashboard"
import { ModuloAtendimentos } from "@/components/features/documentacao/modulos/ModuloAtendimentos"
import { ModuloLeads } from "@/components/features/documentacao/modulos/ModuloLeads"
import { ModuloPacientes } from "@/components/features/documentacao/modulos/ModuloPacientes"
import { ModuloProcedimentos } from "@/components/features/documentacao/modulos/ModuloProcedimentos"
import { ModuloBaseConhecimento } from "@/components/features/documentacao/modulos/ModuloBaseConhecimento"
import { ModuloMidiaMarketing } from "@/components/features/documentacao/modulos/ModuloMidiaMarketing"
import { ModuloConfiguracoes } from "@/components/features/documentacao/modulos/ModuloConfiguracoes"
import { ModuloMeuPerfil } from "@/components/features/documentacao/modulos/ModuloMeuPerfil"

export default function DocumentacaoPage() {
  const abas = [
    {
      valor: "dashboard",
      titulo: "Dashboard",
      icone: <LayoutDashboard className="h-3.5 w-3.5" />,
      conteudo: <ModuloDashboard />,
    },
    {
      valor: "atendimentos",
      titulo: "Atendimentos",
      icone: <Kanban className="h-3.5 w-3.5" />,
      conteudo: <ModuloAtendimentos />,
    },
    {
      valor: "leads",
      titulo: "Leads",
      icone: <UserSearch className="h-3.5 w-3.5" />,
      conteudo: <ModuloLeads />,
    },
    {
      valor: "pacientes",
      titulo: "Pacientes",
      icone: <Users className="h-3.5 w-3.5" />,
      conteudo: <ModuloPacientes />,
    },
    {
      valor: "procedimentos",
      titulo: "Procedimentos",
      icone: <Stethoscope className="h-3.5 w-3.5" />,
      conteudo: <ModuloProcedimentos />,
    },
    {
      valor: "base-conhecimento",
      titulo: "Base de Conhecimento",
      icone: <Brain className="h-3.5 w-3.5" />,
      conteudo: <ModuloBaseConhecimento />,
    },
    {
      valor: "midia-marketing",
      titulo: "Mídia Marketing",
      icone: <Film className="h-3.5 w-3.5" />,
      conteudo: <ModuloMidiaMarketing />,
    },
    {
      valor: "meu-perfil",
      titulo: "Meu Perfil",
      icone: <User className="h-3.5 w-3.5" />,
      conteudo: <ModuloMeuPerfil />,
    },
    {
      valor: "configuracoes",
      titulo: "Configurações",
      icone: <Settings className="h-3.5 w-3.5" />,
      conteudo: <ModuloConfiguracoes />,
    },
  ]

  return (
    <>
      <PageHeader
        titulo="Documentação"
        descricao="Guia completo de uso da Central Dr. Lucas — selecione um módulo para começar"
      >
        <BotaoDownloadDoc />
      </PageHeader>
      <TabsDocumentacao abas={abas} />
    </>
  )
}
