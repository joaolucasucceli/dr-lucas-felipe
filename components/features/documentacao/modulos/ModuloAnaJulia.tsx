import { MessageCircle, Wrench, Target, ShieldAlert } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloAnaJulia() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<MessageCircle />}
        titulo="Ana Júlia"
        subtitulo="SDR que atende pacientes no WhatsApp"
        gradientClasses="from-pink-500 to-rose-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <Target />,
            titulo: "Conduz o funil",
            descricao: "Acolhimento → qualificação → agendamento → reunião agendada. Vai até fechar a avaliação.",
          },
          {
            icone: <Wrench />,
            titulo: "Consulta e age",
            descricao: "Busca paciente, procedimentos, base de conhecimento e agenda. Marca, remarca e cancela avaliações.",
          },
          {
            icone: <ShieldAlert />,
            titulo: "Regras fixas",
            descricao: "Nunca informa preço, nunca admite ser IA, nunca usa emojis. Sempre consulta antes de responder.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Paciente escreve", descricao: "Mensagem chega no WhatsApp da clínica via Uazapi." },
          { numero: 2, titulo: "Ana Júlia responde", descricao: "Processa o histórico, consulta o que precisar e devolve resposta humanizada em blocos." },
          { numero: 3, titulo: "Fecha a avaliação", descricao: "Quando o paciente confirma horário, ela registra o agendamento e o evento vai pro Google Calendar." },
        ]}
      />

      <DicaImportante
        texto="A Ana Júlia só conversa. Quem lê o histórico e atualiza o CRM (nome, procedimento, anotações, etapa do funil) é a Eduarda."
        variante="info"
      />
    </div>
  )
}
