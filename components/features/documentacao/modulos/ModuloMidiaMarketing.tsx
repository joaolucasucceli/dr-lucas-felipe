import { Film, Upload, Send, Image } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloMidiaMarketing() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<Film />}
        titulo="Mídia Marketing"
        subtitulo="Fotos e vídeos que a Ana Júlia envia aos pacientes"
        gradientClasses="from-amber-600 to-orange-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Upload />,
            titulo: "Upload direto",
            descricao: "Envie fotos e vídeos do computador. Ficam disponíveis pra IA enviar quando fizer sentido.",
          },
          {
            icone: <Image />,
            titulo: "4 categorias",
            descricao: "Reels, antes e depois, depoimentos e procedimentos. Associe ao procedimento quando couber.",
          },
          {
            icone: <Send />,
            titulo: "Envio automático",
            descricao: "Paciente pediu foto de resultado? A Ana Júlia escolhe e envia sozinha pelo WhatsApp.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Abra a tela", descricao: "No menu, clique 'Mídia Marketing'. A tabela lista tudo que já foi cadastrado." },
          { numero: 2, titulo: "Cadastre uma mídia", descricao: "'Nova Mídia': título, categoria, procedimento e upload do arquivo." },
          { numero: 3, titulo: "A IA usa sozinha", descricao: "A Ana Júlia seleciona a mídia mais relevante quando o paciente pede referência visual." },
        ]}
      />

      <DicaImportante
        texto="Associe cada foto de antes/depois ao procedimento certo. Quanto mais específico, melhor a escolha da Ana Júlia na hora de enviar."
        variante="sucesso"
      />
    </div>
  )
}
