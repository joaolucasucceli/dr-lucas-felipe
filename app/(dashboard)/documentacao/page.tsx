import {
  LayoutDashboard,
  UserSearch,
  Kanban,
  CalendarDays,
  Stethoscope,
  Bot,
  BarChart3,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { PageHeader } from "@/components/features/shared/PageHeader"
import { TabsDocumentacao } from "@/components/features/documentacao/TabsDocumentacao"
import { BotaoDownloadDoc } from "@/components/features/documentacao/BotaoDownloadDoc"
import { ModuloDashboard } from "@/components/features/documentacao/modulos/ModuloDashboard"
import { ModuloLeads } from "@/components/features/documentacao/modulos/ModuloLeads"
import { ModuloAtendimentos } from "@/components/features/documentacao/modulos/ModuloAtendimentos"
import { ModuloAgendamentos } from "@/components/features/documentacao/modulos/ModuloAgendamentos"
import { ModuloProcedimentos } from "@/components/features/documentacao/modulos/ModuloProcedimentos"
import { ModuloAnaJulia } from "@/components/features/documentacao/modulos/ModuloAnaJulia"
import { ModuloRelatorios } from "@/components/features/documentacao/modulos/ModuloRelatorios"
import { ModuloConfiguracoes } from "@/components/features/documentacao/modulos/ModuloConfiguracoes"
import { ModuloUsuarios } from "@/components/features/documentacao/modulos/ModuloUsuarios"
import { ModuloSugestoes } from "@/components/features/documentacao/modulos/ModuloSugestoes"

export default function DocumentacaoPage() {
  const abas = [
    {
      valor: "dashboard",
      titulo: "Dashboard",
      icone: <LayoutDashboard className="h-3.5 w-3.5" />,
      conteudo: <ModuloDashboard />,
    },
    {
      valor: "leads",
      titulo: "Leads",
      icone: <UserSearch className="h-3.5 w-3.5" />,
      conteudo: <ModuloLeads />,
    },
    {
      valor: "atendimentos",
      titulo: "Atendimentos",
      icone: <Kanban className="h-3.5 w-3.5" />,
      conteudo: <ModuloAtendimentos />,
    },
    {
      valor: "agendamentos",
      titulo: "Agendamentos",
      icone: <CalendarDays className="h-3.5 w-3.5" />,
      conteudo: <ModuloAgendamentos />,
    },
    {
      valor: "procedimentos",
      titulo: "Procedimentos",
      icone: <Stethoscope className="h-3.5 w-3.5" />,
      conteudo: <ModuloProcedimentos />,
    },
    {
      valor: "ana-julia",
      titulo: "Ana Júlia",
      icone: <Bot className="h-3.5 w-3.5" />,
      conteudo: <ModuloAnaJulia />,
    },
    {
      valor: "relatorios",
      titulo: "Relatórios",
      icone: <BarChart3 className="h-3.5 w-3.5" />,
      conteudo: <ModuloRelatorios />,
    },
    {
      valor: "configuracoes",
      titulo: "Configurações",
      icone: <Settings className="h-3.5 w-3.5" />,
      conteudo: <ModuloConfiguracoes />,
    },
    {
      valor: "usuarios",
      titulo: "Usuários e Permissões",
      icone: <ShieldCheck className="h-3.5 w-3.5" />,
      conteudo: <ModuloUsuarios />,
    },
    {
      valor: "sugestoes",
      titulo: "Sugestões",
      icone: <Sparkles className="h-3.5 w-3.5" />,
      conteudo: <ModuloSugestoes />,
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
