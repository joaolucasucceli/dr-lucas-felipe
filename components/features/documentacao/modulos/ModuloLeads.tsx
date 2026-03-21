import { UserSearch, Search, Users, Download, Eye } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloLeads() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<UserSearch />}
        titulo="Leads"
        subtitulo="Gestão completa da base de pacientes e potenciais clientes"
        gradientClasses="from-violet-600 to-purple-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Search />,
            titulo: "Busca e filtros",
            descricao: "Filtre por nome, WhatsApp, etapa do funil e status de arquivamento. Combine filtros para localizar leads específicos.",
          },
          {
            icone: <Users />,
            titulo: "Cadastro de leads",
            descricao: "Crie leads manualmente com nome, WhatsApp, procedimento de interesse e canal de origem.",
          },
          {
            icone: <Download />,
            titulo: "Exportação CSV",
            descricao: "Exporte a lista filtrada em formato CSV para análise em planilhas ou ferramentas externas.",
          },
          {
            icone: <Eye />,
            titulo: "Perfil completo",
            descricao: "Clique em qualquer lead para acessar histórico de conversas, fotos antes/depois e todos os agendamentos.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Visualize e filtre leads",
            descricao: "Use os filtros de etapa, status e busca por nome ou WhatsApp para segmentar a lista.",
          },
          {
            numero: 2,
            titulo: "Crie um novo lead",
            descricao: "Clique em 'Novo Lead', preencha nome e WhatsApp (obrigatórios) e salve. Os demais campos são opcionais.",
          },
          {
            numero: 3,
            titulo: "Acesse o perfil",
            descricao: "Clique em qualquer linha da tabela para abrir o perfil completo com histórico, fotos e agendamentos.",
          },
          {
            numero: 4,
            titulo: "Exporte os dados",
            descricao: "Com os filtros aplicados, clique em 'Exportar CSV' para gerar relatório segmentado.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Cria, edita e arquiva leads", "Reatribui responsável", "Exporta CSV e acessa LGPD"],
            },
            {
              perfil: "Atendente",
              acesso: "total",
              acoes: ["Cria, edita e visualiza leads", "Não gerencia usuários responsáveis"],
            },
          ]}
        />
        <DicaImportante
          texto="O número de WhatsApp é único no sistema — a Ana Júlia usa esse campo para identificar o paciente durante o atendimento. Nunca cadastre o mesmo número para dois leads diferentes."
          variante="aviso"
        />
      </div>
    </div>
  )
}
