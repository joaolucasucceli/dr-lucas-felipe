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
        titulo="Conteúdo em Mídia"
        subtitulo="Fotos e vídeos que a Ana Júlia envia aos pacientes"
        gradientClasses="from-amber-700 to-orange-600"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Upload />,
            titulo: "Upload direto",
            descricao: "Envie fotos e vídeos do computador. Ficam disponíveis pra Ana Júlia escolher quando fizer sentido.",
          },
          {
            icone: <Image />,
            titulo: "Descrição rica = escolha melhor",
            descricao: "A Ana Júlia escolhe a mídia certa lendo a descrição. Inclua perfil, resultado destacável e indicação típica.",
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
          { numero: 1, titulo: "Abra a aba", descricao: "No menu, abra 'Conteúdo da IA' → aba 'Conteúdo em Mídia'. A tabela lista tudo que já foi cadastrado." },
          { numero: 2, titulo: "Cadastre uma mídia", descricao: "'Nova Mídia': descrição detalhada e upload do arquivo (foto ou vídeo, até 20MB)." },
          { numero: 3, titulo: "A Ana Júlia usa sozinha", descricao: "Quando o paciente pede referência visual, ela seleciona a mídia mais relevante pelo contexto." },
        ]}
      />

      <DicaImportante
        texto="Descrição é tudo. A Ana Júlia escolhe mídia lendo o texto, não a foto. Quanto mais rica a descrição (perfil, resultado, indicação), mais assertivo o envio."
        variante="sucesso"
      />
    </div>
  )
}
