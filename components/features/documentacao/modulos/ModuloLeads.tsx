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
        titulo="Contatos"
        subtitulo="Gestão unificada de leads e pacientes"
        gradientClasses="from-violet-600 to-purple-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Search />,
            titulo: "Busca e filtros",
            descricao: "Filtre por nome, WhatsApp, tipo e etapa do funil.",
          },
          {
            icone: <Users />,
            titulo: "Cadastro unificado",
            descricao: "Crie pacientes com nome, WhatsApp, procedimento de interesse e origem. Leads entram pelo WhatsApp ou site.",
          },
          {
            icone: <Eye />,
            titulo: "Perfil completo",
            descricao: "Conversas, prontuário, fotos antes/depois e agendamentos reunidos num só lugar.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Filtre a lista", descricao: "Use os filtros de tipo, etapa e busca pra segmentar." },
          { numero: 2, titulo: "Crie um paciente", descricao: "'Novo Paciente': nome e WhatsApp são obrigatórios, o resto é opcional." },
          { numero: 3, titulo: "Abra o perfil", descricao: "Clique numa linha pra ver histórico, prontuário, fotos e agendamentos." },
        ]}
      />

      <DicaImportante
        texto="O número de WhatsApp é único no sistema. A Ana Júlia usa ele pra identificar o paciente — nunca cadastre o mesmo número em dois contatos."
        variante="aviso"
      />
    </div>
  )
}
