import { Users, ClipboardList, Heart, FolderOpen } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { PermissoesCallout } from "../PermissoesCallout"
import { DicaImportante } from "../DicaImportante"

export function ModuloPacientes() {
  return (
    <div className="space-y-8">
      <HeroBanner
        icone={<Users />}
        titulo="Pacientes"
        subtitulo="Cadastro completo de pacientes com prontuário integrado"
        gradientClasses="from-emerald-600 to-teal-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Users />,
            titulo: "Conversão de Lead",
            descricao: "Converta leads qualificados em pacientes com um clique. O lead é arquivado e um prontuário é criado automaticamente.",
          },
          {
            icone: <ClipboardList />,
            titulo: "Prontuário completo",
            descricao: "Anamnese, sinais vitais, evolução clínica, documentos e galeria de fotos. Timeline cronológica de todo o histórico.",
          },
          {
            icone: <Heart />,
            titulo: "Dados pessoais",
            descricao: "Nome, WhatsApp, CPF, data de nascimento, sexo, endereço, contato de emergência e consentimento LGPD.",
          },
          {
            icone: <FolderOpen />,
            titulo: "Layout em 2 colunas",
            descricao: "Dados pessoais à esquerda e prontuário à direita. Tudo visível sem precisar trocar de aba.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          {
            numero: 1,
            titulo: "Converta o lead",
            descricao: "Na página do lead, clique em 'Converter em Paciente'. Um prontuário será criado automaticamente e o lead será arquivado.",
          },
          {
            numero: 2,
            titulo: "Preencha os dados",
            descricao: "Acesse Pacientes no menu, abra o paciente e preencha os dados pessoais. Salvamento automático ao sair do campo.",
          },
          {
            numero: 3,
            titulo: "Gerencie o prontuário",
            descricao: "Na coluna direita, registre anamnese, sinais vitais, evoluções, faça upload de documentos e fotos do paciente.",
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <PermissoesCallout
          permissoes={[
            {
              perfil: "Gestor",
              acesso: "total",
              acoes: ["Converte leads em pacientes", "Gerencia prontuário completo", "Visualiza todos os pacientes"],
            },
            {
              perfil: "Atendente",
              acesso: "nenhum",
              acoes: [],
            },
          ]}
        />
        <DicaImportante
          texto="O consentimento LGPD deve ser obtido antes de coletar dados pessoais. Marque o checkbox na ficha do paciente após obter autorização."
          variante="aviso"
        />
      </div>
    </div>
  )
}
