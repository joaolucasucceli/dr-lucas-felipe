import { Users, ClipboardList, Heart } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloPacientes() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<Users />}
        titulo="Pacientes"
        subtitulo="Cadastro e prontuário dos pacientes convertidos"
        gradientClasses="from-emerald-600 to-teal-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Users />,
            titulo: "Conversão de lead",
            descricao: "Transforme um lead em paciente com um clique. O prontuário é criado automaticamente.",
          },
          {
            icone: <ClipboardList />,
            titulo: "Prontuário completo",
            descricao: "Anamnese, evolução clínica, documentos e galeria de fotos em timeline cronológica.",
          },
          {
            icone: <Heart />,
            titulo: "Dados pessoais",
            descricao: "CPF, nascimento, endereço, contato de emergência e consentimento LGPD.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Converta o lead", descricao: "Na página do lead, clique 'Converter em Paciente'. Prontuário nasce pronto." },
          { numero: 2, titulo: "Preencha os dados", descricao: "Dados pessoais à esquerda, prontuário à direita. Salva automático." },
          { numero: 3, titulo: "Gerencie evoluções", descricao: "Registre anamnese, suba documentos, atualize fotos ao longo do tratamento." },
        ]}
      />

      <DicaImportante
        texto="Marque o consentimento LGPD antes de coletar dados pessoais do paciente."
        variante="aviso"
      />
    </div>
  )
}
