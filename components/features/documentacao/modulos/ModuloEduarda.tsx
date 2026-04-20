import { BrainCog, ClipboardList, TrendingUp, FileText } from "lucide-react"
import { HeroBanner } from "../HeroBanner"
import { FeaturesGrid } from "../FeaturesGrid"
import { ComoUsarSection } from "../ComoUsarSection"
import { DicaImportante } from "../DicaImportante"

export function ModuloEduarda() {
  return (
    <div className="space-y-6">
      <HeroBanner
        icone={<BrainCog />}
        titulo="Eduarda"
        subtitulo="Analista que lê as conversas e escreve no CRM"
        gradientClasses="from-violet-600 to-purple-400"
      />

      <FeaturesGrid
        features={[
          {
            icone: <ClipboardList />,
            titulo: "Análise automática",
            descricao: "Roda no fim de cada resposta da Ana Júlia. Lê o histórico e decide o que atualizar.",
          },
          {
            icone: <TrendingUp />,
            titulo: "Avança o funil",
            descricao: "Acolhimento → qualificação → agendamento, nunca regride. Avaliação agendada quem marca é a Ana Júlia.",
          },
          {
            icone: <FileText />,
            titulo: "Escreve no CRM",
            descricao: "Atualiza nome, procedimento, qualificação comercial e adiciona observações no 'sobre o paciente'.",
          },
        ]}
      />

      <ComoUsarSection
        passos={[
          { numero: 1, titulo: "Ana Júlia termina de responder", descricao: "A Eduarda é disparada sem bloquear o fluxo." },
          { numero: 2, titulo: "Lê contexto", descricao: "Usa últimos 30 turnos da conversa + estado atual do lead." },
          { numero: 3, titulo: "Aplica mudanças", descricao: "Atualiza o lead respeitando regras: nunca regride etapa, nunca salta etapas." },
        ]}
      />

      <DicaImportante
        texto="Sinais comerciais (timing, decisor, orçamento, contraindicações) entram como anotações no 'sobre o paciente' com prefixo [sinal:...] — fica fácil filtrar depois."
        variante="info"
      />
    </div>
  )
}
