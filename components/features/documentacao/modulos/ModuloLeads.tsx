import { UserSearch, Search, Users, Eye } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloLeads() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<UserSearch />}
        titulo="Leads"
        subtitulo="Gestão da base de potenciais pacientes"
        gradientClasses="from-violet-600 to-purple-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Search />,
            titulo: "Busca e filtros",
            descricao: "Filtre por nome, WhatsApp, etapa do funil ou arquivamento. Exporte em CSV.",
          },
          {
            icone: <Users />,
            titulo: "Cadastro manual",
            descricao: "Crie leads com nome, WhatsApp, procedimento de interesse e origem.",
          },
          {
            icone: <Eye />,
            titulo: "Perfil completo",
            descricao: "Conversas, fotos antes/depois e agendamentos reunidos num só lugar.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Filtre a lista", descricao: "Use os filtros de etapa, status e busca pra segmentar." },
          { numero: 2, titulo: "Crie um lead", descricao: "'Novo Lead': nome e WhatsApp são obrigatórios, o resto é opcional." },
          { numero: 3, titulo: "Abra o perfil", descricao: "Clique numa linha pra ver histórico, fotos e agendamentos." },
        ]}
      />

      <DicaImportante
        texto="O número de WhatsApp é único no sistema. A Ana Júlia usa ele pra identificar o paciente — nunca cadastre o mesmo número pra dois leads."
        variante="aviso"
      />
    </div>
  )
}
